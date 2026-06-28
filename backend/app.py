import os
import uvicorn
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI,Depends
from fastapi.middleware.cors import CORSMiddleware
from core.database import create_db_and_tables
from middleware.auth import SessionAuthenticationMiddleware
from fastapi_limiter.depends import RateLimiter
from pyrate_limiter import Duration, Limiter, Rate
from routes.bookmark_routes import router as bookmark_router
from routes.insight_routes import router as insight_router
from routes.books_routes import router as books_router
from routes.chatbot_routes import rag_ai_router
from routes.quiz_routes import router as quiz_ai_router
from routes.recommendation_routes import router as recommendation_router
from routes.voice_routes import router as voice_router

load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL")
global_limiter = Limiter(Rate(60, Duration.SECOND * 60))

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan,dependencies=[Depends(RateLimiter(limiter=global_limiter))])

app.add_middleware(SessionAuthenticationMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(insight_router)
app.include_router(bookmark_router)
app.include_router(recommendation_router)
app.include_router(books_router)
app.include_router(rag_ai_router)
app.include_router(voice_router)
app.include_router(quiz_ai_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)