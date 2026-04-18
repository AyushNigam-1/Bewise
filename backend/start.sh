#!/bin/bash

echo "Starting RQ Worker..."
rq worker --url $REDIS_URL &

echo "Starting FastAPI Server..."
exec uvicorn app:app --host 0.0.0.0 --port 7860