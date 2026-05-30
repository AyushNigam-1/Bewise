from fastapi import APIRouter, Request, Depends
from pydantic import BaseModel
from fastapi_limiter.depends import RateLimiter
from pyrate_limiter import Limiter, Rate, Duration

from controllers.recommendation_controller import recommend, session_recommend

shared_limiter = Limiter(Rate(60, Duration.SECOND * 60))
router = APIRouter(dependencies=[Depends(RateLimiter(limiter=shared_limiter))])


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