import pytest
from fastapi.testclient import TestClient
from main import app # Imports your FastAPI instance

@pytest.fixture(scope="module")
def client():
    """
    Creates a fresh FastAPI TestClient for your test modules.
    """
    with TestClient(app) as c:
        yield c