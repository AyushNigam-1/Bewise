import json
import time

import sentry_sdk
from core.analytics import posthog
from core.redis import CACHE_TTL, redis_client
from fastapi import HTTPException
from repositories.recommendation_repository import RecommendationRepository
from services.vector import recommend_for_user, recommend_next_insights


def recommend(user_id: str):
    start_time = time.time()
    cache_key = f"recommend:{user_id}"
    cached_data = redis_client.get(cache_key)

    if cached_data:
        data = json.loads(cached_data)
        latency = time.time() - start_time
        posthog.capture(
            distinct_id=user_id,
            event="recommendations_fetched",
            properties={"source": "redis_cache", "latency_seconds": round(latency, 2)},
        )
        return data

    try:
        # 1. Ask the Repo for data
        insight_ids = RecommendationRepository.get_user_favourite_insights(user_id)

        # 2. Get AI Recommendations
        recommendations = recommend_for_user(insight_ids)

        # 3. Cache and Return
        result = {"recommendations": recommendations}
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))

        latency = time.time() - start_time
        posthog.capture(
            distinct_id=user_id,
            event="recommendations_fetched",
            properties={"source": "vector_db", "latency_seconds": round(latency, 2)},
        )

        return result

    except Exception as e:
        sentry_sdk.capture_exception(e)
        raise HTTPException(
            status_code=500, detail="Failed to generate recommendations"
        )


def session_recommend(user_id: str, insight_id: int):
    cache_key = f"session_recommend:{user_id}:{insight_id}"
    cached_data = redis_client.get(cache_key)

    if cached_data:
        data = json.loads(cached_data)
        posthog.capture(
            distinct_id=user_id,
            event="session_recommendations_fetched",
            properties={"source": "redis_cache"},
        )
        return data

    try:
        # 1. Ask the Repo for the specific insight AND the user's bookmarks
        insight_obj = RecommendationRepository.get_insight(insight_id)
        if not insight_obj:
            raise HTTPException(status_code=404, detail="Insight not found")

        bookmarked_ids = RecommendationRepository.get_user_favourite_insights(user_id)

        # 2. Get contextual AI Recommendations
        recommendations = recommend_next_insights(
            current_insight_title=insight_obj.title,
            current_insight_description=insight_obj.description,
            user_bookmarked_ids=bookmarked_ids,
            current_insight_id=insight_id,
            top_k=3,
        )

        # 3. Cache and Return
        result = {"recommendations": recommendations}
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))

        posthog.capture(
            distinct_id=user_id,
            event="session_recommendations_fetched",
            properties={"source": "vector_db"},
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        sentry_sdk.capture_exception(e)
        raise HTTPException(
            status_code=500, detail="Failed to fetch session recommendations"
        )
