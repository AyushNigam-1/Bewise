import json
from types import SimpleNamespace
from unittest.mock import patch

import controllers.recommendation_controller as recommendations
import pytest


@pytest.fixture
def module_deps(monkeypatch, base_fake_deps):
    """
    Injects FakeRedis, PostHog, and Sentry from the global conftest into the controller.
    """
    redis = base_fake_deps["redis"]
    posthog = base_fake_deps["posthog"]
    sentry = base_fake_deps["sentry"]

    monkeypatch.setattr(recommendations, "redis_client", redis)
    monkeypatch.setattr(recommendations, "posthog", posthog)
    monkeypatch.setattr(recommendations, "CACHE_TTL", 123)
    monkeypatch.setattr(recommendations.sentry_sdk, "capture_exception", sentry)

    return redis, posthog, sentry


def test_recommend_uses_cache(module_deps):
    redis, posthog, _ = module_deps

    # fakeredis uses standard .set() and .get()
    redis.set("recommend:u1", json.dumps({"recommendations": ["cached"]}))

    result = recommendations.recommend("u1")

    assert result == {"recommendations": ["cached"]}
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "redis_cache"


@patch("controllers.recommendation_controller.RecommendationRepository")
@patch("controllers.recommendation_controller.recommend_for_user")
def test_recommend_builds_and_caches(mock_recommend_ai, mock_repo, module_deps):
    redis, posthog, _ = module_deps

    # 1. Arrange: Fake the Database Repo and the AI Service
    mock_repo.get_user_favourite_insights.return_value = [1, 2]
    mock_recommend_ai.return_value = ["r1", "r2"]

    # 2. Act
    result = recommendations.recommend("u1")

    # 3. Assert
    assert result == {"recommendations": ["r1", "r2"]}
    mock_repo.get_user_favourite_insights.assert_called_once_with("u1")
    mock_recommend_ai.assert_called_once_with([1, 2])

    # Verify the cache was populated correctly
    assert json.loads(redis.get("recommend:u1")) == {"recommendations": ["r1", "r2"]}

    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "vector_db"


def test_session_recommend_uses_cache(module_deps):
    redis, posthog, _ = module_deps
    redis.set("session_recommend:u1:5", json.dumps({"recommendations": ["cached"]}))

    result = recommendations.session_recommend("u1", 5)

    assert result == {"recommendations": ["cached"]}
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "redis_cache"


@patch("controllers.recommendation_controller.RecommendationRepository")
@patch("controllers.recommendation_controller.recommend_next_insights")
def test_session_recommend_builds_and_caches(
    mock_recommend_next_ai, mock_repo, module_deps
):
    redis, posthog, _ = module_deps

    # 1. Arrange: Fake the current insight in the DB
    insight = SimpleNamespace(
        id=5,
        title="Current Insight",
        description="Current description",
    )
    mock_repo.get_insight.return_value = insight
    mock_repo.get_user_favourite_insights.return_value = [9, 10]

    # Fake the AI vector search response
    mock_recommend_next_ai.return_value = ["next1", "next2"]

    # 2. Act
    result = recommendations.session_recommend("u1", 5)

    # 3. Assert
    assert result == {"recommendations": ["next1", "next2"]}

    # Verify the AI service was called with the exact right context
    mock_recommend_next_ai.assert_called_once_with(
        current_insight_title="Current Insight",
        current_insight_description="Current description",
        user_bookmarked_ids=[9, 10],
        current_insight_id=5,
        top_k=3,
    )

    # Verify the cache was populated correctly
    assert json.loads(redis.get("session_recommend:u1:5")) == {
        "recommendations": ["next1", "next2"]
    }

    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "vector_db"
