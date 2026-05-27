def test_health_check(client):
    """
    Tests if the FastAPI server is alive.
    Assuming you have a standard GET "/" or "/health" route.
    """
    response = client.get("/") # Change to an endpoint you actually have
    assert response.status_code == 200

def test_rag_query_validation(client):
    """
    Tests if the endpoint rejects bad data (e.g., missing query).
    """
    # Sending an empty payload
    response = client.post("/api/rag/query", json={})
    
    # FastAPI should automatically throw a 422 Unprocessable Entity
    assert response.status_code == 422