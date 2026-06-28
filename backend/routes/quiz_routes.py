from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from pyrate_limiter import Limiter, Rate, Duration
from fastapi_limiter.depends import RateLimiter
from core.telemetry import TelemetryRoute 
from controllers.quiz_controller import QuizService, get_quiz_service

limiter = Limiter(Rate(30, Duration.MINUTE * 1))

router = APIRouter(
    prefix="/ai/quiz",
    dependencies=[Depends(RateLimiter(limiter=limiter))],
    route_class=TelemetryRoute
)

class QuizRequest(BaseModel):
    source_text: str

# --- 1. User Context Dependency ---
def get_optional_user_id(request: Request) -> str:
    """Safely extracts the user ID if present, otherwise returns 'anonymous'."""
    user = getattr(request.state, "user", None)
    return user["id"] if user and "id" in user else "anonymous"


# --- 2. The Clean Route (NO add_routes ALLOWED BELOW THIS LINE) ---
@router.post("/invoke") 
def generate_quiz_route(
    request_data: QuizRequest,
    user_id: str = Depends(get_optional_user_id),
    service: QuizService = Depends(get_quiz_service)
):
    # Call our injected service directly
    result = service.generate_quiz(text=request_data.source_text, user_id=user_id)
    
    # Wrap in "output" to keep the frontend happy
    return {"output": result}