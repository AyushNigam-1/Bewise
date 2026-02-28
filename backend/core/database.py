import psycopg2

dbname = "postgres"
user = "ayush"
password = "AyushNigam"
host = "localhost"
port = "5432"

def connect_db():
    """Connects to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port=port
        )
        return conn
    except psycopg2.DatabaseError as e:
        print(f"Database connection error: {e}")
        return None