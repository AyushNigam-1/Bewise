import pytest
from fastapi.testclient import TestClient
from app import app
from core.database import get_session
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

@compiles(ARRAY, 'sqlite')
def compile_array_sqlite(type_, compiler, **kw):
    # Tell SQLite to treat Postgres Arrays as basic JSON
    return 'JSON'

@compiles(JSONB, 'sqlite')
def compile_jsonb_sqlite(type_, compiler, **kw):
    # Tell SQLite to treat Postgres JSONB as basic JSON
    return 'JSON'

SQLITE_URL = "sqlite:///:memory:"
test_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})

def override_get_session():
    """
    This function replaces your normal database session.
    Every time FastAPI asks for the database, it gets the ghost DB instead.
    """
    with Session(test_engine) as session:
        yield session

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """
    Before any tests run, create all the tables in the ghost database.
    After all tests finish, drop them.
    """
    SQLModel.metadata.create_all(test_engine)
    yield
    SQLModel.metadata.drop_all(test_engine)


@pytest.fixture(scope="module")
def client():
    """
    Creates a fresh FastAPI TestClient, but tells FastAPI to swap out
    the real database for our ghost database.
    """
    # Override the dependency globally for the test client
    app.dependency_overrides[get_session] = override_get_session
    
    with TestClient(app) as c:
        yield c
        
    # Clean up overrides after tests
    app.dependency_overrides.clear()