from fastapi import APIRouter, Depends
from pydantic import BaseModel
from routes.utils import get_current_user_id
from core.telemetry import TelemetryRoute
from controllers.recommendation_controller import RecommendationService, get_recommendation_service

router = APIRouter(route_class=TelemetryRoute)

class SessionRecommendRequest(BaseModel):
    insight_id: int

# --- Clean DI Routes ---
@router.get("/recommend")
def recommend_route(
    user_id: str = Depends(get_current_user_id),
    service: RecommendationService = Depends(get_recommendation_service)
):
    return service.recommend(user_id)


@router.post("/insights/session-recommend")
def session_recommend_route(
    payload: SessionRecommendRequest,
    user_id: str = Depends(get_current_user_id),
    service: RecommendationService = Depends(get_recommendation_service)
):
    return service.session_recommend(user_id, payload.insight_id)