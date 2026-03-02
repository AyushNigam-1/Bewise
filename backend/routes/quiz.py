from fastapi import APIRouter , Depends
from fastapi_limiter.depends import RateLimiter
from langserve import add_routes
from controllers.quiz_handler import quiz_runnable
from pyrate_limiter import Limiter, Rate, Duration
from fastapi_limiter.depends import RateLimiter

limiter = Limiter(Rate(10, Duration.MINUTE * 1))

quiz_ai_router = APIRouter(
    prefix="/ai/quiz",
    dependencies=[Depends(RateLimiter(limiter=limiter))]
)

add_routes(
    quiz_ai_router,
    quiz_runnable,
    path=""
)