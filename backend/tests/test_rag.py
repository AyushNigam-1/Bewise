import pytest


@pytest.mark.integration
@pytest.mark.rag
@pytest.mark.slow
def test_rag_langserve_happy_path(client):
    """
    Tests the LangServe /invoke endpoint with a valid query.
    LangServe wraps inputs in an 'input' dictionary.
    """
    # 1. Arrange: LangServe requires the data inside an "input" key
    payload = {
        "input": {
            "message": "What is the hybrid architecture?",
            "session_id": "test-session-123",
            "books_ids": [],
            "insights_ids": [],
        }
    }

    # 2. Act: Hit the auto-generated LangServe /invoke route
    response = client.post("/ai/rag/invoke", json=payload)

    # 3. Assert: Verify the server processed it
    assert response.status_code == 200, (
        f"Expected 200, got {response.status_code}: {response.text}"
    )

    # LangServe wraps the final output in an "output" dictionary
    data = response.json()
    assert "output" in data, "LangServe response missing 'output' wrapper!"

    final_response = data["output"]

    # Verify your custom response structure from chatbot_handler.py
    assert "answer" in final_response, "Missing 'answer' in final_response"
    assert "insights" in final_response, "Missing 'insights' in final_response"
    assert len(final_response["answer"]) > 0


@pytest.mark.integration
@pytest.mark.rag
@pytest.mark.slow
def test_rag_conversational_fallback(client):
    """
    Tests Rule #4 of your system prompt:
    Casual greetings should return a friendly response without insights.
    """
    payload = {
        "input": {"message": "how are you?", "session_id": "test-session-greeting"}
    }

    response = client.post("/ai/rag/invoke", json=payload)
    assert response.status_code == 200

    final_response = response.json()["output"]

    # 1. Ensure the LLM gave a reasonable length response
    assert len(final_response["answer"]) > 10, (
        "Response was suspiciously short or empty."
    )

    # 2. THE CRITICAL CHECK: It should NOT cite any insights for a basic greeting
    assert len(final_response["insights"]) == 0, (
        "LLM hallucinated or incorrectly cited insights for a casual greeting!"
    )


@pytest.mark.integration
@pytest.mark.rag
def test_rag_langserve_validation_error(client):
    """
    Tests the Sad Path. If we don't provide the 'input' wrapper,
    LangServe should reject it as a bad request.
    """
    # Arrange: Sending raw data instead of putting it inside "input"
    bad_payload = {"message": "This will fail"}

    response = client.post("/ai/rag/invoke", json=bad_payload)

    # Assert: LangServe/FastAPI should return a 422 Validation Error
    assert response.status_code in [422, 429], "Expected Validation Error (422) or Rate Limit (429)"