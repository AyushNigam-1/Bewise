import pytest


@pytest.mark.integration
@pytest.mark.rag
@pytest.mark.slow
def test_rag_api_happy_path(client):
    """
    Tests the standard /invoke endpoint with a valid query.
    No more LangServe wrappers—just clean, flat JSON.
    """
    # 1. Arrange: Send a flat payload matching the RAGRequest Pydantic model
    payload = {
        "message": "What is the hybrid architecture?",
        "books_ids": [],
        "insights_ids": [],
    }

    # 2. Act: Hit our custom DI route
    response = client.post("/ai/rag/invoke", json=payload)

    # 3. Assert: Verify the server processed it
    assert response.status_code == 200, (
        f"Expected 200, got {response.status_code}: {response.text}"
    )

    data = response.json()
    # We kept the "output" wrapper in the route so the frontend wouldn't break
    assert "output" in data, "Response missing 'output' wrapper!"

    final_response = data["output"]

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
    # Flat payload, no session_id required (handled by auth middleware)
    payload = {
        "message": "how are you?"
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
def test_rag_api_validation_error(client):
    """
    Tests the Sad Path. If we omit the required 'message' field,
    FastAPI and Pydantic should instantly reject it.
    """
    # Arrange: Sending a payload missing the required 'message' field
    bad_payload = {
        "books_ids": [123] 
    }

    response = client.post("/ai/rag/invoke", json=bad_payload)

    # Assert: FastAPI should catch this before it ever hits our service logic
    assert response.status_code in [422, 429], "Expected Validation Error (422) or Rate Limit (429)"