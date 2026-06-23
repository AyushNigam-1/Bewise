import subprocess
import time
import pytest
import os
import sys
import requests
from pact import Verifier
from testcontainers.postgres import PostgresContainer

PROVIDER_URL = "http://127.0.0.1:8000"
PACT_FILE_PATH = os.path.join(os.path.dirname(__file__), "./BookistFrontend-BookistBackend.json")

@pytest.fixture(scope="module", autouse=True)
def run_fastapi_server_with_db():
    with PostgresContainer("postgres:16-alpine") as postgres:
        raw_db_url = postgres.get_connection_url()
        
        # FIX 1: Strip +psycopg2 so it perfectly mimics your Supabase URL format
        clean_db_url = raw_db_url.replace("+psycopg2", "")
        
        my_env = os.environ.copy()
        my_env["DATABASE_URL"] = clean_db_url
        my_env["PACT_TESTING"] = "true" 
        
        print(f"\n🐳 Testcontainer Postgres running at: {clean_db_url}")

        proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "tests.pact.pact_app:app", "--host", "127.0.0.1", "--port", "8000"],
            stdout=sys.stdout, # 🚨 PRINTS UVICORN LOGS TO YOUR TERMINAL
            stderr=sys.stderr, #
            env=my_env
        )
        
        # FIX 2: Give it a full 60 seconds (120 retries) to load the AI models
        max_retries = 120
        for _ in range(max_retries):
            try:
                if requests.get(f"{PROVIDER_URL}/docs").status_code == 200:
                    print("🚀 Pact Test Server is UP!")
                    break
            except requests.exceptions.ConnectionError:
                time.sleep(0.5)
        else:
            proc.terminate()
            stderr_output = proc.stderr.read().decode("utf-8")
            stdout_output = proc.stdout.read().decode("utf-8")
            pytest.fail(
                f"Server failed to start.\n"
                f"--- STDOUT ---\n{stdout_output}\n"
                f"--- STDERR ---\n{stderr_output}"
            )
        
        yield  
        
        proc.terminate()
        proc.wait()

@pytest.mark.integration
def test_pact_provider_compliance():
    verifier = (
        Verifier("BookistBackend", host="127.0.0.1")
        .add_source(PACT_FILE_PATH)
        # 🚨 BRING THIS BACK: Tells Pact to trigger dynamic DB seeding
        .state_handler("http://127.0.0.1:8000/_pact/setup", body=True)
        .add_transport(protocol="http", port=8000)
    )

    print(f"🕵️‍♂️ Verifying pact...")
    verifier.verify()
    print("✅ Pact Contract Verified Successfully!")