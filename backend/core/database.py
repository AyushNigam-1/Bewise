import os
import psycopg2

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:AyushNigam@localhost:5432/postgres"
)

def connect_db():
    """Connects to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except psycopg2.DatabaseError as e:
        print(f"Database connection error: {e}")
        return None