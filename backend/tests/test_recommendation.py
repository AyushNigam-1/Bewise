import json
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

import controllers.recommendation_handler as recommendations


class DummyRedis:
    def __init__(self):
        self.store = {}
        self.deleted = []

    def get(self, key):
        return self.store.get(key)

    def setex(self, key, ttl, value):
        self.store[key] = value

    def delete(self, key):
        self.deleted.append(key)
        self.store.pop(key, None)


class FakeResult:
    def __init__(self, items):
        self._items = list(items)

    def all(self):
        return self._items

    def first(self):
        return self._items[0] if self._items else None


class FakeSession:
    def __init__(self, get_results=None):
        self.get_results = list(get_results or [])

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def get(self, model, pk):
        if self.get_results:
            return self.get_results.pop(0)
        return None


@pytest.fixture
def fake_deps(monkeypatch):
    redis = DummyRedis()
    posthog = MagicMock()
    sentry = MagicMock()

    monkeypatch.setattr(recommendations, "redis_client", redis)
    monkeypatch.setattr(recommendations, "posthog", posthog)
    monkeypatch.setattr(recommendations, "CACHE_TTL", 123)
    monkeypatch.setattr(recommendations.sentry_sdk, "capture_exception", sentry)

    return redis, posthog, sentry


def test_recommend_uses_cache(fake_deps):
    redis, posthog, _ = fake_deps
    redis.store["recommend:u1"] = json.dumps({"recommendations": ["cached"]})

    result = recommendations.recommend("u1")

    assert result == {"recommendations": ["cached"]}
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "redis_cache"


def test_recommend_builds_and_caches(monkeypatch, fake_deps):
    redis, posthog, _ = fake_deps
    user = SimpleNamespace(user_id="u1", favourite_insights=[1, 2])

    session = FakeSession(get_results=[user])
    monkeypatch.setattr(recommendations, "Session", lambda engine: session)

    rec_mock = MagicMock(return_value=["r1", "r2"])
    monkeypatch.setattr(recommendations, "recommend_for_user", rec_mock)

    result = recommendations.recommend("u1")

    assert result == {"recommendations": ["r1", "r2"]}
    rec_mock.assert_called_once_with([1, 2])
    assert json.loads(redis.store["recommend:u1"]) == {"recommendations": ["r1", "r2"]}
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "vector_db"


def test_session_recommend_uses_cache(fake_deps):
    redis, posthog, _ = fake_deps
    redis.store["session_recommend:u1:5"] = json.dumps({"recommendations": ["cached"]})

    result = recommendations.session_recommend("u1", 5)

    assert result == {"recommendations": ["cached"]}
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "redis_cache"


def test_session_recommend_builds_and_caches(monkeypatch, fake_deps):
    redis, posthog, _ = fake_deps
    insight = SimpleNamespace(
        id=5,
        title="Current Insight",
        description="Current description",
    )
    user = SimpleNamespace(user_id="u1", favourite_insights=[9, 10])

    session = FakeSession(get_results=[insight, user])
    monkeypatch.setattr(recommendations, "Session", lambda engine: session)

    next_mock = MagicMock(return_value=["next1", "next2"])
    monkeypatch.setattr(recommendations, "recommend_next_insights", next_mock)

    result = recommendations.session_recommend("u1", 5)

    assert result == {"recommendations": ["next1", "next2"]}
    next_mock.assert_called_once_with(
        current_insight_title="Current Insight",
        current_insight_description="Current description",
        user_bookmarked_ids=[9, 10],
        current_insight_id=5,
        top_k=3,
    )
    assert json.loads(redis.store["session_recommend:u1:5"]) == {
        "recommendations": ["next1", "next2"]
    }
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "vector_db"