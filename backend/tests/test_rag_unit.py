import pytest
from unittest.mock import MagicMock, patch
from controllers.chatbot_controller import RAGResponse


@pytest.fixture
def mock_dependencies():
    """
    Advanced PyTest Fixture to patch out all external network bound services.
    Bypasses Pinecone vector search, Groq LLM generations, and the new DB Repositories.
    """
    # 1. Mock the Vector Database and the NEW Repository functions!
    with (
        patch("controllers.chatbot_controller.search_insights") as mock_vector,
        patch("controllers.chatbot_controller.llm") as mock_llm,
        patch("controllers.chatbot_controller.get_book_names_by_ids") as mock_get_books,
        patch("controllers.chatbot_controller.get_explicit_insights") as mock_get_insights,
    ):
        # Set up what the fake Pinecone vector search returns instantly
        mock_vector.return_value = [
            {
                "insight_id": 42,
                "book": "Clean Code",
                "category": "Architecture",
                "title": "Keep functions small",
                "description": "Functions should do one thing and do it well.",
                "source": "vector",
            }
        ]

        # Set up a fake structured output generator for the Groq LLM
        mock_structured_llm = MagicMock()
        mock_structured_llm.invoke.return_value = RAGResponse(
            answer="According to Clean Code, functions must be small and modular.",
            ids=[42],
        )
        mock_llm.with_structured_output.return_value = mock_structured_llm

        # Default repo returns
        mock_get_books.return_value = []
        mock_get_insights.return_value = []

        yield {
            "vector": mock_vector,
            "llm_invoke": mock_structured_llm.invoke,
            "get_books": mock_get_books,
            "get_insights": mock_get_insights,
        }


@pytest.mark.unit
@pytest.mark.rag
def test_unit_rag_flow_success(client, mock_dependencies):
    """
    Tests that your application routes inputs to the retrieve node,
    maps context block components correctly, and processes structured responses.
    """
    payload = {
        "input": {
            "message": "Tell me about function size",
            "session_id": "mock-session-001",
        }
    }

    # Act: Invoke the LangServe route
    response = client.post("/ai/rag/invoke", json=payload)

    # Assert
    assert response.status_code == 200
    data = response.json()["output"]

    assert data["answer"] == "According to Clean Code, functions must be small and modular."
    assert "Clean Code" in data["insights"]
    assert data["insights"]["Clean Code"][0]["id"] == 42

    mock_dependencies["vector"].assert_called_once()
    mock_dependencies["llm_invoke"].assert_called_once()


@pytest.mark.unit
@pytest.mark.rag
def test_unit_rag_llm_failure_handling(client, mock_dependencies):
    """
    Tests your explicit error handling resiliency code.
    If the Groq LLM throws a random timeout or connectivity crash,
    does your code activate the conversational fallback gracefully?
    """
    mock_dependencies["llm_invoke"].side_effect = Exception("Groq API rate limit")

    payload = {"input": {"message": "What up bot", "session_id": "mock-session-crash"}}

    # Act
    response = client.post("/ai/rag/invoke", json=payload)

    # Assert
    assert response.status_code == 200
    data = response.json()["output"]

    assert "I am Wiser, your reading assistant!" in data["answer"]
    assert len(data["insights"]) == 0


@pytest.mark.unit
@pytest.mark.rag
def test_unit_rag_fatal_entrypoint_crash(client, mock_dependencies):
    """
    Tests forcing a fatal exception in the graph invocation.
    Because NodeTracker re-raises the exact original exception, we test for it safely.
    """
    with patch("controllers.chatbot_controller.rag_graph.invoke") as mock_graph:
        mock_graph.side_effect = Exception("FATAL SYSTEM FAILURE")

        payload = {
            "input": {"message": "This should explode", "session_id": "test"}
        }

        with pytest.raises(Exception) as exc_info:
            client.post("/ai/rag/invoke", json=payload)

        # The NodeTracker beautifully preserves the exact error message
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
    client, mock_dependencies, insights_ids, books_ids
):
    """
    Tests that explicit insight/book queries hit the new Repositories.
    """
    # 1. Arrange: Setup the fake repository responses
    mock_dependencies["get_books"].return_value = ["Atomic Habits"]
    mock_dependencies["get_insights"].return_value = [
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

    payload = {"input": {"message": "Tell me about habits", "session_id": "test"}}
    if insights_ids is not None:
        payload["input"]["insights_ids"] = insights_ids
    if books_ids is not None:
        payload["input"]["books_ids"] = books_ids

    # 2. Act
    response = client.post("/ai/rag/invoke", json=payload)

    # 3. Assert
    assert response.status_code == 200
    # Prove the repositories were called
    mock_dependencies["get_books"].assert_called()
    mock_dependencies["get_insights"].assert_called()


@pytest.mark.unit
@pytest.mark.rag
def test_unit_rag_db_fetch_crash(client, mock_dependencies):
    """
    Tests the exception block inside retrieve_node.
    If the repository database code is offline, it should gracefully 
    continue to vector search instead of killing the request.
    """
    # Force the repository to crash
    mock_dependencies["get_books"].side_effect = Exception("SQL Server Offline")

    payload = {
        "input": {"message": "Tell me about habits", "insights_ids": [99]}
    }

    response = client.post("/ai/rag/invoke", json=payload)

    # It should still return 200 because vector search acts as a fallback
    assert response.status_code == 200
    
    # Prove the fallback worked by ensuring vector search was still called
    mock_dependencies["vector"].assert_called_once()


@pytest.mark.unit
@pytest.mark.rag
def test_unit_rag_no_insights_found(client, mock_dependencies):
    """
    Tests the 'empty response' guard logic.
    If the LLM determines the provided context does not answer the question,
    it returns empty lists, triggering a specific fallback message.
    """
    # 1. Arrange: The LLM politely returns nothing
    mock_dependencies["llm_invoke"].return_value = RAGResponse(answer="", ids=[])

    payload = {
        "input": {"message": "What is airspeed?", "session_id": "test-empty"}
    }

    # 2. Act
    response = client.post("/ai/rag/invoke", json=payload)

    # 3. Assert
    assert response.status_code == 200
    data = response.json()["output"]
    assert data["answer"] == "No relevant insight found to answer your question."
    assert len(data["insights"]) == 0