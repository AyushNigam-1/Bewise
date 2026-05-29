import os
from contextlib import asynccontextmanager

import sentry_sdk
import uvicorn
from core.analytics import posthog
from core.database import create_db_and_tables
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from middleware.auth import SessionAuthenticationMiddleware
from routes.bookmark_routes import router as bookmark_router
from routes.books import router as books_router
from routes.chatbot import rag_ai_router
from routes.quiz import quiz_ai_router
from routes.recommendation_routes import router as recommendation_router
from routes.users import router as users_router
from routes.voice import router as voice_router

load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL")


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield
    posthog.flush()


sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    send_default_pii=True,
)

app = FastAPI(lifespan=lifespan)

app.add_middleware(SessionAuthenticationMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(bookmark_router)
app.include_router(recommendation_router)
app.include_router(books_router)
app.include_router(users_router)
app.include_router(rag_ai_router)
app.include_router(voice_router)
app.include_router(quiz_ai_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
