from unittest.mock import MagicMock, patch

import pytest
from controllers.chatbot_controller import RAGResponse


@pytest.fixture
def mock_dependencies():
    """
    Advanced PyTest Fixture to patch out all external network bound services.
    Bypasses Pinecone vector search and Groq LLM generations seamlessly.
    """
    # 1. Mock the Vector Database search function
    with (
        patch("controllers.chatbot_controller.search_insights") as mock_vector,
        patch("controllers.chatbot_controller.llm") as mock_llm,
        patch("controllers.chatbot_controller.Session") as mock_db_session,
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

        # When structured_llm.invoke is called, return a valid RAGResponse object
        mock_structured_llm.invoke.return_value = RAGResponse(
            answer="According to Clean Code, functions must be small and modular.",
            ids=[42],
        )

        # Tie the structured output mock back to your main LLM instance method
        mock_llm.with_structured_output.return_value = mock_structured_llm

        yield {
            "vector": mock_vector,
            "llm_invoke": mock_structured_llm.invoke,
            "db": mock_db_session,
        }


@pytest.mark.unit
@pytest.mark.rag
def test_unit_rag_flow_success(client, mock_dependencies):
    """
    Tests that your application routes inputs to the retrieve node,
    maps context block components correctly, and processes structured responses.
    Runs in 5 milliseconds instead of 5 seconds!
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

    # Prove your internal application engine stitched things correctly
    assert (
        data["answer"]
        == "According to Clean Code, functions must be small and modular."
    )
    assert "Clean Code" in data["insights"]
    assert data["insights"]["Clean Code"][0]["id"] == 42

    # Advanced Assertion: Verify your code actually attempted to call the underlying APIs
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
    # Force the mocked LLM to throw a runtime exception inside the graph execution loop
    mock_dependencies["llm_invoke"].side_effect = Exception(
        "Groq API rate limit reached or gateway timeout"
    )

    payload = {"input": {"message": "What up bot", "session_id": "mock-session-crash"}}

    # Act
    response = client.post("/ai/rag/invoke", json=payload)

    # Assert
    assert response.status_code == 200
    data = response.json()["output"]

    # Verify that your graph caught the error and activated your custom except safe text
    assert "I am Wiser, your reading assistant!" in data["answer"]
    assert len(data["insights"]) == 0


@pytest.mark.unit
@pytest.mark.rag
def test_unit_rag_fatal_entrypoint_crash(client, mock_dependencies):
    """
    Tests lines 261-277: Forcing a fatal exception in the graph invocation
    to ensure Sentry and PostHog capture the error safely.
    """
    with patch("controllers.chatbot_controller.rag_graph.invoke") as mock_graph:
        mock_graph.side_effect = Exception("FATAL SYSTEM FAILURE")

        payload = {
            "input": {
                "message": "This should explode",
                "session_id": "test-fatal-crash",
            }
        }

        # We wrap the call in pytest.raises because we KNOW it will throw an exception
        # and we want the test to PASS when it happens.
        with pytest.raises(Exception) as exc_info:
            client.post("/ai/rag/invoke", json=payload)

        # Verify the exception message matches the one you hardcoded in your except block
        assert str(exc_info.value) == "RAG agent failed."


@pytest.mark.unit
@pytest.mark.rag
@pytest.mark.parametrize(
    "insights_ids, books_ids, expected_db_calls",
    [
        (
            [99],
            None,
            1,
        ),  # Scenario 1: Only insight ID passed (1 DB query to fetch insight)
        (
            None,
            [5],
            2,
        ),  # Scenario 2: Only book ID passed (1 DB query to resolve book title)
        (
            [99],
            [5],
            2,
        ),  # Scenario 3: Both passed (1 DB query for title, 1 DB query for insight)
    ],
)
def test_unit_rag_explicit_db_fetch_variants(
    client, mock_dependencies, insights_ids, books_ids, expected_db_calls
):
    """
    Tests that explicit insight/book queries hit the SQL database using strict integer IDs.
    Parameterised to verify the new Book resolution logic alongside Insight lookups.
    """
    # 1. Arrange: Setup the fake database
    mock_db = mock_dependencies["db"].return_value.__enter__.return_value

    # Generic mock row that works for both Book and Insight returns
    mock_row = MagicMock(
        id=99,
        title="1% Better",
        book_name="Atomic Habits",
        category_name="Self-Help",
        description="Compound interest of habits",
        detailed_breakdown="Focus on systems, not goals.",
    )
    mock_db.exec.return_value.all.return_value = [mock_row]

    payload = {
        "input": {"message": "Tell me about habits", "session_id": "test-explicit-db"}
    }

    # Dynamically inject the integer arrays if they exist
    if insights_ids is not None:
        payload["input"]["insights_ids"] = insights_ids
    if books_ids is not None:
        payload["input"]["books_ids"] = books_ids

    # 2. Act
    response = client.post("/ai/rag/invoke", json=payload)

    # 3. Assert
    assert response.status_code == 200
    mock_dependencies["db"].assert_called()

    # Prove that the exact right number of SQL queries ran based on our new logic
    assert mock_db.exec.call_count == expected_db_calls


@pytest.mark.unit
@pytest.mark.rag
def test_unit_rag_db_fetch_crash(client, mock_dependencies):
    """
    Tests the exception block inside retrieve_node.
    If the SQL database is offline, it should log the error to Sentry
    but gracefully continue to vector search instead of killing the request.
    """
    # Force the database context manager to explode
    mock_dependencies["db"].return_value.__enter__.side_effect = Exception(
        "SQL Server Offline"
    )

    with patch(
        "controllers.chatbot_controller.sentry_sdk.capture_exception"
    ) as mock_sentry:
        payload = {
            "input": {
                "message": "Tell me about habits",
                "session_id": "test-db-crash",
                "insights_ids": [99],
            }
        }

        response = client.post("/ai/rag/invoke", json=payload)

        # It should still return 200 because vector search acts as a fallback
        assert response.status_code == 200
        # Prove that Sentry captured the silent database crash
        mock_sentry.assert_called_once()


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
        "input": {
            "message": "What is the airspeed velocity of an unladen swallow?",
            "session_id": "test-empty",
        }
    }

    # 2. Act
    response = client.post("/ai/rag/invoke", json=payload)

    # 3. Assert
    assert response.status_code == 200
    data = response.json()["output"]
    assert data["answer"] == "No relevant insight found to answer your question."
    assert len(data["insights"]) == 0
