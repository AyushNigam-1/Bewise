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


@pytest.fixture
def patch_controller(monkeypatch, base_fake_deps):
    """
    FIXTURE FACTORY: A globally reusable hook to patch any controller module.
    """

    def _patcher(controller_module):
        redis = base_fake_deps["redis"]
        posthog = base_fake_deps["posthog"]
        sentry = base_fake_deps["sentry"]

        # 1. Patch Redis locally on the controller (if it uses it)
        monkeypatch.setattr(controller_module, "redis_client", redis, raising=False)
        monkeypatch.setattr(controller_module, "CACHE_TTL", 123, raising=False)

        # 2. GLOBAL PATCH: Since all controllers now use NodeTracker, 
        # we intercept PostHog and Sentry directly at the telemetry module!
        monkeypatch.setattr("core.telemetry.posthog", posthog, raising=False)
        monkeypatch.setattr("core.telemetry.sentry_sdk.capture_exception", sentry, raising=False)

        return redis, posthog, sentry

    return _patcher


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

    yield {"redis": redis, "posthog": posthog, "sentry": sentry}

    redis.flushall()


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


# Add this to the bottom of tests/conftest.py


def pytest_collection_modifyitems(config, items):
    """
    CUSTOM HOOK: Intelligent Test Ordering.
    Forces all lightning-fast @pytest.mark.unit tests to run first,
    pushing @pytest.mark.slow and @pytest.mark.integration tests to the end.
    """
    fast_tests = []
    slow_tests = []

    for item in items:
        # Check if the test has been tagged as slow or integration
        if item.get_closest_marker("slow") or item.get_closest_marker("integration"):
            slow_tests.append(item)
        else:
            fast_tests.append(item)

    # Completely overwrite the execution queue with our sorted lists
    items[:] = fast_tests + slow_tests
