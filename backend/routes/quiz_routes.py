from fastapi import APIRouter , Depends
from langserve import add_routes
from controllers.quiz_controller import quiz_runnable
from pyrate_limiter import Limiter, Rate, Duration
from fastapi_limiter.depends import RateLimiter
from core.telemetry import TelemetryRoute 

limiter = Limiter(Rate(30, Duration.MINUTE * 1))

quiz_ai_router = APIRouter(
    prefix="/ai/quiz",
    dependencies=[Depends(RateLimiter(limiter=limiter))],
    route_class=TelemetryRoute
)

add_routes(
    quiz_ai_router,
    quiz_runnable,
    path=""
)