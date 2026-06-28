from typing import Any, List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from pyrate_limiter import Limiter, Rate, Duration
from fastapi_limiter.depends import RateLimiter
from core.telemetry import TelemetryRoute
from routes.utils import get_optional_user_id
from controllers.chatbot_controller import RAGService, get_rag_service

limiter = Limiter(Rate(10, Duration.MINUTE * 1))

rag_ai_router = APIRouter(
    prefix="/ai/rag",
    dependencies=[Depends(RateLimiter(limiter=limiter))],
    route_class=TelemetryRoute
)

class RAGRequest(BaseModel):
    message: str
    books_ids: Optional[List[Any]] = None
    insights_ids: Optional[List[Any]] = None

@rag_ai_router.post("/invoke")
def rag_invoke_route(
    payload: RAGRequest,
    user_id: str = Depends(get_optional_user_id),
    service: RAGService = Depends(get_rag_service)
):
    input_data = {
        "message": payload.message,
        "books_ids": payload.books_ids,
        "insights_ids": payload.insights_ids
    }
    
    result = service.rag_entrypoint(input_data=input_data, user_id=user_id)
    
    return {"output": result}