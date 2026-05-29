import json
import time
import sentry_sdk
from fastapi import HTTPException
from sqlmodel import Session

from core.analytics import posthog
from core.database import engine
from core.models import User, Insight
from core.redis import redis_client, CACHE_TTL
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
        with Session(engine) as session:
            user = session.get(User, user_id)
            insight_ids = user.favourite_insights if user else []

        recommendations = recommend_for_user(insight_ids)

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
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")


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
        with Session(engine) as session:
            insight_obj = session.get(Insight, insight_id)
            if not insight_obj:
                raise HTTPException(status_code=404, detail="Insight not found")

            user = session.get(User, user_id)
            bookmarked_ids = user.favourite_insights if user else []

        recommendations = recommend_next_insights(
            current_insight_title=insight_obj.title,
            current_insight_description=insight_obj.description,
            user_bookmarked_ids=bookmarked_ids,
            current_insight_id=insight_id,
            top_k=3,
        )

        result = {"recommendations": recommendations}
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))

        posthog.capture(
            distinct_id=user_id,
            event="session_recommendations_fetched",
            properties={"source": "vector_db"},
        )
        return result
    except Exception as e:
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=500, detail="Failed to fetch session recommendations")