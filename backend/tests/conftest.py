# tests/conftest.py
from unittest.mock import MagicMock

# The Enterprise Tools
import fakeredis
import pytest
from app import app
from core.database import get_session
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from testcontainers.postgres import PostgresContainer

# --- THE INFRASTRUCTURE FIXTURES ---


@pytest.fixture(scope="session")
def postgres_engine():
    """
    Spins up a real PostgreSQL Docker container before any tests run.
    It creates the tables, yields the engine to the tests, and completely
    destroys the container and the data when the test suite finishes.
    """
    # Spin up Postgres 15 (match this to your production version!)
    with PostgresContainer("postgres:15-alpine") as postgres:
        # Testcontainers dynamically assigns a random open port
        db_url = postgres.get_connection_url()
        engine = create_engine(db_url)

        # Build your actual production schema inside the container
        SQLModel.metadata.create_all(engine)

        yield engine
        # The 'with' context manager automatically kills the container here


@pytest.fixture
def db_session(postgres_engine):
    """
    Provides a clean, real database session for individual tests to use.
    """
    with Session(postgres_engine) as session:
        yield session


# --- THE DEPENDENCY FIXTURES ---


@pytest.fixture
def base_fake_deps():
    """
    Returns enterprise-grade fake objects for background dependencies.
    """
    # FakeRedis perfectly mimics a real Redis server in RAM automatically
    redis = fakeredis.FakeRedis(decode_responses=True)

    # We still use MagicMock for analytics because we NEVER want to
    # accidentally send test data to our production PostHog/Sentry dashboards
    posthog = MagicMock()
    sentry = MagicMock()

    return {"redis": redis, "posthog": posthog, "sentry": sentry}


# --- THE FASTAPI TEST CLIENT ---


@pytest.fixture(scope="module")
def client(postgres_engine):
    """
    Creates a fresh FastAPI TestClient, intercepting the database dependency
    to point to our Testcontainer Postgres instance instead of production.
    """

    def override_get_session():
        with Session(postgres_engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
