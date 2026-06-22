from fastapi import APIRouter, Request
from pydantic import BaseModel
from controllers.recommendation_controller import recommend, session_recommend
from core.telemetry import TelemetryRoute

router = APIRouter(route_class=TelemetryRoute)

class SessionRecommendRequest(BaseModel):
    insight_id: int


def get_user_id(request: Request) -> str:
    return request.state.user["id"]


@router.get("/recommend")
def recommend_route(request: Request):
    return recommend(get_user_id(request))


@router.post("/insights/session-recommend")
def session_recommend_route(payload: SessionRecommendRequest, request: Request):
    return session_recommend(get_user_id(request), payload.insight_id)