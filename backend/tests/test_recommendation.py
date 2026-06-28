import inspect
import json
from unittest.mock import MagicMock

import fakeredis
import pytest
from tests.factories import InsightFactory

from controllers.recommendation_controller import RecommendationService


def _build_recommendation_service(redis, repo, recommend_for_user, recommend_next_insights):
    signature = inspect.signature(RecommendationService.__init__)
    params = [
        p for p in signature.parameters.values()
        if p.name != "self"
    ]

    available = {
        "redis_client": redis,
        "redis": redis,
        "cache": redis,
        "repository": repo,
        "repo": repo,
        "recommend_for_user_func": recommend_for_user,
        "recommend_for_user": recommend_for_user,
        "recommend_next_insights_func": recommend_next_insights,
        "recommend_next_insights": recommend_next_insights,
    }

    kwargs = {}
    for param in params:
        if param.name in available:
            kwargs[param.name] = available[param.name]

    # If we matched every parameter by name, use kwargs.
    if len(kwargs) == len(params):
        return RecommendationService(**kwargs)

    # Otherwise fall back to positional order.
    ordered_args = [redis, repo, recommend_for_user, recommend_next_insights][:len(params)]
    return RecommendationService(*ordered_args)


@pytest.fixture
def service_deps():
    redis = fakeredis.FakeRedis(decode_responses=True)
    repo = MagicMock()
    recommend_for_user = MagicMock()
    recommend_next_insights = MagicMock()

    service = _build_recommendation_service(
        redis,
        repo,
        recommend_for_user,
        recommend_next_insights,
    )

    return redis, repo, recommend_for_user, recommend_next_insights, service


@pytest.mark.unit
def test_recommend_uses_cache(service_deps):
    redis, _, _, _, service = service_deps

    redis.set("recommend:u1", json.dumps({"recommendations": ["cached"]}))

    result = service.recommend("u1")

    assert result == {"recommendations": ["cached"]}


@pytest.mark.unit
def test_recommend_builds_and_caches(service_deps):
    redis, repo, recommend_for_user, _, service = service_deps

    repo.get_user_favourite_insights.return_value = [1, 2]
    recommend_for_user.return_value = ["r1", "r2"]

    result = service.recommend("u1")

    assert result == {"recommendations": ["r1", "r2"]}
    repo.get_user_favourite_insights.assert_called_once_with("u1")
    recommend_for_user.assert_called_once_with([1, 2])
    assert json.loads(redis.get("recommend:u1")) == {
        "recommendations": ["r1", "r2"]
    }


@pytest.mark.unit
def test_session_recommend_uses_cache(service_deps):
    redis, _, _, _, service = service_deps

    redis.set(
        "session_recommend:u1:5",
        json.dumps({"recommendations": ["cached"]}),
    )

    result = service.session_recommend("u1", 5)

    assert result == {"recommendations": ["cached"]}


@pytest.mark.unit
def test_session_recommend_builds_and_caches(service_deps):
    redis, repo, _, recommend_next_insights, service = service_deps

    insight = InsightFactory.build(
        id=5,
        title="Current Insight",
        description="Current description",
    )
    repo.get_insight.return_value = insight
    repo.get_user_favourite_insights.return_value = [9, 10]
    recommend_next_insights.return_value = ["next1", "next2"]

    result = service.session_recommend("u1", 5)

    assert result == {"recommendations": ["next1", "next2"]}

    recommend_next_insights.assert_called_once_with(
        current_insight_title="Current Insight",
        current_insight_description="Current description",
        user_bookmarked_ids=[9, 10],
        current_insight_id=5,
        top_k=3,
    )

    assert json.loads(redis.get("session_recommend:u1:5")) == {
        "recommendations": ["next1", "next2"]
    }