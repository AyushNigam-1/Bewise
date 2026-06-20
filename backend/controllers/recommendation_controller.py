import json
import logging
from fastapi import HTTPException
from core.redis import CACHE_TTL, redis_client
from repositories.recommendation_repository import RecommendationRepository
from services.vector import recommend_for_user, recommend_next_insights

# 1. Standard Python logger handles everything
logger = logging.getLogger(__name__)


def recommend(user_id: str):
    cache_key = f"recommend:{user_id}"
    log_context = {
        "user_id": user_id,
        "action": "recommendations_fetched"
    }

    try:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            log_context["source"] = "redis_cache"
            logger.info("Fetched general recommendations", extra=log_context)
            return json.loads(cached_data)

        insight_ids = RecommendationRepository.get_user_favourite_insights(user_id)
        recommendations = recommend_for_user(insight_ids)

        result = {"recommendations": recommendations}
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))

        log_context["source"] = "vector_db"
        logger.info("Fetched general recommendations", extra=log_context)
        return result

    except Exception as e:
        logger.exception("Failed to generate recommendations", extra=log_context)
        raise HTTPException(
            status_code=500, detail="Failed to generate recommendations"
        ) from e


def session_recommend(user_id: str, insight_id: int):
    cache_key = f"session_recommend:{user_id}:{insight_id}"
    log_context = {
        "user_id": user_id,
        "insight_id": insight_id,
        "action": "session_recommendations_fetched"
    }

    try:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            log_context["source"] = "redis_cache"
            logger.info("Fetched session recommendations", extra=log_context)
            return json.loads(cached_data)

        insight_obj = RecommendationRepository.get_insight(insight_id)
        if not insight_obj:
            logger.warning(f"Insight not found: {insight_id}", extra=log_context)
            raise HTTPException(status_code=404, detail="Insight not found")

        bookmarked_ids = RecommendationRepository.get_user_favourite_insights(user_id)

        recommendations = recommend_next_insights(
            current_insight_title=insight_obj.title,
            current_insight_description=insight_obj.description,
            user_bookmarked_ids=bookmarked_ids,
            current_insight_id=insight_id,
            top_k=3,
        )

        result = {"recommendations": recommendations}
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))

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