from fastapi import APIRouter, Depends
from fastapi_limiter.depends import RateLimiter
from langserve import add_routes
from controllers.chatbot_controller import rag_runnable
from pyrate_limiter import Limiter, Rate, Duration
from fastapi_limiter.depends import RateLimiter

limiter = Limiter(Rate(10, Duration.MINUTE * 1))

rag_ai_router = APIRouter(
    prefix="/ai/rag",
    dependencies=[Depends(RateLimiter(limiter=limiter))]
)

add_routes(
    rag_ai_router,
    rag_runnable,
    path=""
)
