import json
from fastapi import HTTPException
from core.telemetry import NodeTracker
from core.redis import CACHE_TTL, redis_client
from repositories.recommendation_repository import RecommendationRepository
from services.vector import recommend_for_user, recommend_next_insights


def recommend(user_id: str):
    cache_key = f"recommend:{user_id}"

    with NodeTracker("recommendations_fetched", session_id=user_id) as tracker:
        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                tracker.add_data(source="redis_cache")
                return json.loads(cached_data)

            insight_ids = RecommendationRepository.get_user_favourite_insights(user_id)
            recommendations = recommend_for_user(insight_ids)

            result = {"recommendations": recommendations}
            redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))

            tracker.add_data(source="vector_db")
            return result

        except Exception as e:
            raise HTTPException(
                status_code=500, detail="Failed to generate recommendations"
            ) from e


def session_recommend(user_id: str, insight_id: int):
    cache_key = f"session_recommend:{user_id}:{insight_id}"

    with NodeTracker("session_recommendations_fetched", session_id=user_id) as tracker:
        tracker.add_data(insight_id=insight_id)

        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                tracker.add_data(source="redis_cache")
                return json.loads(cached_data)

            insight_obj = RecommendationRepository.get_insight(insight_id)
            if not insight_obj:
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

            tracker.add_data(source="vector_db")
            return result

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500, detail="Failed to fetch session recommendations"
            ) from e