import pytest
from unittest.mock import MagicMock
from controllers.chatbot_controller import RAGService, RAGResponse


# --- 1. Construct the DI Service for Testing ---
@pytest.fixture
def mock_llm():
    """Creates a fake LLM client that supports the .with_structured_output() chain."""
    llm = MagicMock()
    mock_structured = MagicMock()
    llm.with_structured_output.return_value = mock_structured
    return llm


@pytest.fixture
def mock_book_repo():
    return MagicMock()


@pytest.fixture
def mock_insight_repo():
    return MagicMock()


@pytest.fixture
def mock_vector_search():
    return MagicMock()


@pytest.fixture
def service(mock_llm, mock_book_repo, mock_insight_repo, mock_vector_search):
    """Injects all fake dependencies into our RAG Service."""
    return RAGService(
        llm_client=mock_llm,
        book_repo=mock_book_repo,
        insight_repo=mock_insight_repo,
        vector_search_func=mock_vector_search
    )


# --- 2. The Tests ---

@pytest.mark.unit
@pytest.mark.rag
def test_unit_rag_flow_success(service, mock_vector_search, mock_llm):
    """
    Tests that your application routes inputs to the retrieve node,
    maps context block components correctly, and processes structured responses.
    """
    # 1. Arrange: Fake Vector Search Result
    mock_vector_search.return_value = [
        {
            "insight_id": 42,
            "book": "Clean Code",
            "category": "Architecture",
            "title": "Keep functions small",
            "description": "Functions should do one thing and do it well.",
            "source": "vector",
        }
    ]

    # Fake LLM Structured Output
    mock_llm.with_structured_output.return_value.invoke.return_value = RAGResponse(
        answer="According to Clean Code, functions must be small and modular.",
        ids=[42],
    )

    payload = {"message": "Tell me about function size"}

    # 2. Act: Invoke the service directly
    result = service.rag_entrypoint(payload, user_id="mock-session-001")

    # 3. Assert
    assert result["answer"] == "According to Clean Code, functions must be small and modular."
    assert "Clean Code" in result["insights"]
    assert result["insights"]["Clean Code"][0]["id"] == 42

    mock_vector_search.assert_called_once()
    mock_llm.with_structured_output.return_value.invoke.assert_called_once()


@pytest.mark.unit
@pytest.mark.rag
def test_unit_rag_llm_failure_handling(service, mock_llm):
    """
    Tests your explicit error handling resiliency code.
    If the Groq LLM throws a crash, does it activate the conversational fallback?
    """
    # Force the LLM to crash
    mock_llm.with_structured_output.return_value.invoke.side_effect = Exception("Groq API rate limit")

    payload = {"message": "What up bot"}

    result = service.rag_entrypoint(payload, user_id="mock-session-crash")

    assert "I am Wiser, your reading assistant!" in result["answer"]
    assert len(result["insights"]) == 0


@pytest.mark.unit
@pytest.mark.rag
def test_unit_rag_fatal_entrypoint_crash(service):
    """
    Tests forcing a fatal exception in the graph invocation.
    """
    # We can mock the internally compiled graph directly on the service instance
    service.rag_graph = MagicMock()
    service.rag_graph.invoke.side_effect = Exception("FATAL SYSTEM FAILURE")

    payload = {"message": "This should explode"}

    with pytest.raises(Exception) as exc_info:
        service.rag_entrypoint(payload, user_id="test")

    assert str(exc_info.value) == "FATAL SYSTEM FAILURE"


@pytest.mark.unit
@pytest.mark.rag
@pytest.mark.parametrize(
    "insights_ids, books_ids",
    [
        ([99], None), # Scenario 1: Only insight ID passed
        (None, [5]),  # Scenario 2: Only book ID passed
        ([99], [5]),  # Scenario 3: Both passed
    ],
)
def test_unit_rag_explicit_db_fetch_variants(
    service, mock_book_repo, mock_insight_repo, insights_ids, books_ids
):
    """
    Tests that explicit insight/book queries hit the Repositories.
    """
    mock_book_repo.get_book_names_by_ids.return_value = ["Atomic Habits"]
    mock_insight_repo.get_explicit_insights.return_value = [
        {
            "insight_id": 99,
            "book": "Atomic Habits",
            "category": "Self-Help",
            "title": "1% Better",
            "description": "Compound interest",
            "detailed_breakdown": "Focus on systems",
            "source": "explicit"
        }
    ]

    payload = {"message": "Tell me about habits"}
    if insights_ids is not None:
        payload["insights_ids"] = insights_ids
    if books_ids is not None:
        payload["books_ids"] = books_ids

    # The service will not throw an error, we just care that it called the repos
    service.rag_entrypoint(payload, user_id="test")

    mock_book_repo.get_book_names_by_ids.assert_called()
    mock_insight_repo.get_explicit_insights.assert_called()


@pytest.mark.unit
@pytest.mark.rag
def test_unit_rag_db_fetch_crash(service, mock_book_repo, mock_vector_search):
    """
    If the repository database code is offline, it should gracefully 
    continue to vector search instead of killing the request.
    """
    # Force the DB repository to crash
    mock_book_repo.get_book_names_by_ids.side_effect = Exception("SQL Server Offline")

    payload = {"message": "Tell me about habits", "insights_ids": [99]}

    # Act
    service.rag_entrypoint(payload, user_id="test")
    
    # Assert the fallback worked by ensuring vector search was still executed
    mock_vector_search.assert_called_once()


@pytest.mark.unit
@pytest.mark.rag
def test_unit_rag_no_insights_found(service, mock_llm):
    """
    Tests the 'empty response' guard logic.
    If the LLM determines the provided context does not answer the question,
    it returns empty lists, triggering a specific fallback message.
    """
    # The LLM politely returns empty arrays
    mock_llm.with_structured_output.return_value.invoke.return_value = RAGResponse(
        answer="", ids=[]
    )

    payload = {"message": "What is airspeed?"}

    result = service.rag_entrypoint(payload, user_id="test-empty")

    assert result["answer"] == "No relevant insight found to answer your question."
    assert len(result["insights"]) == 0