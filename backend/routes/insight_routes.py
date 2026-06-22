from typing import Any, Dict, List
from controllers.insight_controller import (
    get_book_content,
    get_step_details,
)
from fastapi import APIRouter, Body
from core.telemetry import TelemetryRoute

router = APIRouter(route_class=TelemetryRoute)

@router.post("/book/{title}/content", response_model=Dict[str, Any])
def get_book_content_route(title: str, category: List[str] = Body(default=[])):
    return get_book_content(title, category)


@router.get("/insights/{step_id}")
def get_step_details_route(step_id: int):
    return get_step_details(step_id)