from routes.utils import get_optional_user_id
from typing import Any, Dict, List
from core.telemetry import TelemetryRoute
from fastapi import APIRouter, Body, Depends
from controllers.insight_controller import InsightService, get_insight_service

router = APIRouter(route_class=TelemetryRoute)

@router.post("/book/{title}/content", response_model=Dict[str, Any])
def get_book_content_route(
    title: str, 
    category: List[str] = Body(default=[]),
    user_id: str = Depends(get_optional_user_id),
    service: InsightService = Depends(get_insight_service)
):
    return service.get_book_content(title, category, user_id)


@router.get("/insights/{step_id}")
def get_step_details_route(
    step_id: int,
    user_id: str = Depends(get_optional_user_id),
    service: InsightService = Depends(get_insight_service)
):
    return service.get_step_details(step_id, user_id)