import json
import logging
from typing import Any, Dict
from fastapi import HTTPException
from core.redis import CACHE_TTL

logger = logging.getLogger(__name__)

class RecommendationService:
    """Service class for AI recommendations, injecting DB, Cache, and Vector dependencies."""
    
    def __init__(self, redis_client, repo, recommend_func, session_recommend_func):
        self.redis = redis_client
        self.repo = repo
        self.recommend_for_user = recommend_func
        self.recommend_next_insights = session_recommend_func

    def recommend(self, user_id: str) -> Dict[str, Any]:
        cache_key = f"recommend:{user_id}"
        log_context = {
            "user_id": user_id,
            "action": "recommendations_fetched"
        }

        try:
            cached_data = self.redis.get(cache_key)
            if cached_data:
                log_context["source"] = "redis_cache"
                logger.info("Fetched general recommendations", extra=log_context)
                return json.loads(cached_data)

            insight_ids = self.repo.get_user_favourite_insights(user_id)
            recommendations = self.recommend_for_user(insight_ids)

            result = {"recommendations": recommendations}
            self.redis.setex(cache_key, CACHE_TTL, json.dumps(result))

            log_context["source"] = "vector_db"
            logger.info("Fetched general recommendations", extra=log_context)
            return result

        except Exception as e:
            logger.exception("Failed to generate recommendations", extra=log_context)
            raise HTTPException(
                status_code=500, detail="Failed to generate recommendations"
            ) from e

    def session_recommend(self, user_id: str, insight_id: int) -> Dict[str, Any]:
        cache_key = f"session_recommend:{user_id}:{insight_id}"
        log_context = {
            "user_id": user_id,
            "insight_id": insight_id,
            "action": "session_recommendations_fetched"
        }

        try:
            cached_data = self.redis.get(cache_key)
            if cached_data:
                log_context["source"] = "redis_cache"
                logger.info("Fetched session recommendations", extra=log_context)
                return json.loads(cached_data)

            insight_obj = self.repo.get_insight(insight_id)
            if not insight_obj:
                logger.warning(f"Insight not found: {insight_id}", extra=log_context)
                raise HTTPException(status_code=404, detail="Insight not found")

            bookmarked_ids = self.repo.get_user_favourite_insights(user_id)

            recommendations = self.recommend_next_insights(
                current_insight_title=insight_obj.title,
                current_insight_description=insight_obj.description,
                user_bookmarked_ids=bookmarked_ids,
                current_insight_id=insight_id,
                top_k=3,
            )

            result = {"recommendations": recommendations}
            self.redis.setex(cache_key, CACHE_TTL, json.dumps(result))

            log_context["source"] = "vector_db"
            logger.info("Fetched session recommendations", extra=log_context)
            return result

        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Failed to fetch session recommendations", extra=log_context)
            raise HTTPException(
                status_code=500, detail="Failed to fetch session recommendations"
            ) from e


def get_recommendation_service() -> RecommendationService:
    from core.redis import redis_client
    from repositories.recommendation_repository import RecommendationRepository
    from services.vector import recommend_for_user, recommend_next_insights
    
    return RecommendationService(
        redis_client=redis_client,
        repo=RecommendationRepository,
        recommend_func=recommend_for_user,
        session_recommend_func=recommend_next_insights
    )