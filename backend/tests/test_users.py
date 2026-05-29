import json
from types import SimpleNamespace
from unittest.mock import MagicMock, mock_open
import pytest
import controllers.user_handler as bookmarks


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

    def scan_iter(self, pattern):
        prefix = pattern.replace("*", "")
        return [k for k in list(self.store.keys()) if k.startswith(prefix)]


class FakeResult:
    def __init__(self, items):
        self._items = list(items)

    def all(self):
        return self._items

    def first(self):
        return self._items[0] if self._items else None


class FakeSession:
    def __init__(self, get_results=None, exec_results=None):
        self.get_results = list(get_results or [])
        self.exec_results = list(exec_results or [])
        self.added = []
        self.committed = False

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def get(self, model, pk):
        if self.get_results:
            return self.get_results.pop(0)
        return None

    def exec(self, statement):
        if not self.exec_results:
            raise AssertionError("Unexpected exec() call")
        return FakeResult(self.exec_results.pop(0))

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.committed = True


@pytest.fixture
def fake_deps(monkeypatch):
    redis = DummyRedis()
    posthog = MagicMock()
    sentry = MagicMock()

    monkeypatch.setattr(bookmarks, "redis_client", redis)
    monkeypatch.setattr(bookmarks, "posthog", posthog)
    monkeypatch.setattr(bookmarks, "CACHE_TTL", 123)
    monkeypatch.setattr(bookmarks.sentry_sdk, "capture_exception", sentry)

    return redis, posthog, sentry


def test_toggle_bookmark_book_adds_book(monkeypatch, fake_deps):
    redis, posthog, _ = fake_deps
    user = SimpleNamespace(user_id="u1", favourite_books=[1])

    session = FakeSession(get_results=[user])
    monkeypatch.setattr(bookmarks, "Session", lambda engine: session)

    result = bookmarks.toggle_bookmark_book("u1", 2)

    assert result == {"bookmarked": True, "favourite_books": [1, 2]}
    assert user.favourite_books == [1, 2]
    assert session.committed is True
    assert redis.deleted == ["bookmarks:books_data:u1"]
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["event"] == "book_bookmarked"


def test_toggle_bookmark_book_removes_book(monkeypatch, fake_deps):
    redis, posthog, _ = fake_deps
    user = SimpleNamespace(user_id="u1", favourite_books=[1, 2])

    session = FakeSession(get_results=[user])
    monkeypatch.setattr(bookmarks, "Session", lambda engine: session)

    result = bookmarks.toggle_bookmark_book("u1", 2)

    assert result == {"bookmarked": False, "favourite_books": [1]}
    assert user.favourite_books == [1]
    assert redis.deleted == ["bookmarks:books_data:u1"]
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["event"] == "book_unbookmarked"


def test_toggle_bookmark_insight_adds_and_clears_related_cache(monkeypatch, fake_deps):
    redis, posthog, _ = fake_deps
    user = SimpleNamespace(user_id="u1", favourite_insights=[10])
    redis.store["session_recommend:u1:1"] = "a"
    redis.store["session_recommend:u1:2"] = "b"

    session = FakeSession(get_results=[user])
    monkeypatch.setattr(bookmarks, "Session", lambda engine: session)

    result = bookmarks.toggle_bookmark_insight("u1", 20)

    assert result == {"bookmarked": True, "favourite_insights": [10, 20]}
    assert user.favourite_insights == [10, 20]
    assert session.committed is True
    assert "bookmarks:insights_data:u1" not in redis.store
    assert "recommend:u1" not in redis.store
    assert "session_recommend:u1:1" not in redis.store
    assert "session_recommend:u1:2" not in redis.store
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["event"] == "insight_bookmarked"


def test_recommend_uses_cache(fake_deps):
    redis, posthog, _ = fake_deps
    redis.store["recommend:u1"] = json.dumps({"recommendations": ["cached"]})

    result = bookmarks.recommend("u1")

    assert result == {"recommendations": ["cached"]}
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "redis_cache"


def test_recommend_builds_and_caches(monkeypatch, fake_deps):
    redis, posthog, _ = fake_deps
    user = SimpleNamespace(user_id="u1", favourite_insights=[1, 2])

    session = FakeSession(get_results=[user])
    monkeypatch.setattr(bookmarks, "Session", lambda engine: session)
    rec_mock = MagicMock(return_value=["r1", "r2"])
    monkeypatch.setattr(bookmarks, "recommend_for_user", rec_mock)

    result = bookmarks.recommend("u1")

    assert result == {"recommendations": ["r1", "r2"]}
    rec_mock.assert_called_once_with([1, 2])
    assert json.loads(redis.store["recommend:u1"]) == {"recommendations": ["r1", "r2"]}
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "vector_db"


def test_session_recommend_uses_cache(fake_deps):
    redis, posthog, _ = fake_deps
    redis.store["session_recommend:u1:5"] = json.dumps({"recommendations": ["cached"]})

    result = bookmarks.session_recommend("u1", 5)

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
    monkeypatch.setattr(bookmarks, "Session", lambda engine: session)
    next_mock = MagicMock(return_value=["next1", "next2"])
    monkeypatch.setattr(bookmarks, "recommend_next_insights", next_mock)

    result = bookmarks.session_recommend("u1", 5)

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


def test_get_bookmarked_books_with_categories_uses_cache(fake_deps):
    redis, _, _ = fake_deps
    cached = {"books": [{"id": 1}], "categories": [{"name": "python"}]}
    redis.store["bookmarks:books_data:u1"] = json.dumps(cached)

    result = bookmarks.get_bookmarked_books_with_categories("u1")

    assert result == cached


def test_get_bookmarked_books_with_categories_empty_bookmarks(monkeypatch, fake_deps):
    redis, _, _ = fake_deps
    user = SimpleNamespace(user_id="u1", favourite_books=[])

    session = FakeSession(get_results=[user])
    monkeypatch.setattr(bookmarks, "Session", lambda engine: session)

    result = bookmarks.get_bookmarked_books_with_categories("u1")

    assert result == {"bookmarked_books": [], "favourite_categories": []}
    assert json.loads(redis.store["bookmarks:books_data:u1"]) == result


def test_get_bookmarked_books_with_categories_db_path(monkeypatch, fake_deps):
    redis, posthog, _ = fake_deps
    user = SimpleNamespace(user_id="u1", favourite_books=[1, 2])

    book1 = SimpleNamespace(
        id=1,
        title="Book A",
        author="Author A",
        thumbnail="thumb-a.png",
        description="desc a",
        category=["python", "ai"],
    )
    book2 = SimpleNamespace(
        id=2,
        title="Book B",
        author="Author B",
        thumbnail="thumb-b.png",
        description="desc b",
        category=["python"],
    )

    session = FakeSession(get_results=[user], exec_results=[[book1, book2]])
    monkeypatch.setattr(bookmarks, "Session", lambda engine: session)
    monkeypatch.setattr(
        bookmarks,
        "get_category_details_from_json",
        lambda cat_name, categories_data: {
            "name": cat_name,
            "icon": categories_data.get(cat_name, {}).get("icon", "📌"),
            "description": categories_data.get(cat_name, {}).get(
                "description", f"Explore insights from {cat_name}."
            ),
        },
    )

    categories_json = json.dumps(
        {
            "python": {"icon": "🐍", "description": "Python desc"},
            "ai": {"icon": "🤖", "description": "AI desc"},
        }
    )
    monkeypatch.setattr("builtins.open", mock_open(read_data=categories_json))

    result = bookmarks.get_bookmarked_books_with_categories("u1")

    assert result["books"] == [
        {
            "id": 1,
            "title": "Book A",
            "author": "Author A",
            "thumbnail": "thumb-a.png",
            "description": "desc a",
            "category": ["python", "ai"],
        },
        {
            "id": 2,
            "title": "Book B",
            "author": "Author B",
            "thumbnail": "thumb-b.png",
            "description": "desc b",
            "category": ["python"],
        },
    ]
    assert {c["name"] for c in result["categories"]} == {"python", "ai"}
    assert "bookmarks:books_data:u1" in redis.store
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["event"] == "viewed_bookmarked_books"


def test_get_bookmarked_insights_with_categories_uses_cache(fake_deps):
    redis, _, _ = fake_deps
    cached = {"insights": [{"step_id": 1}], "categories": [{"name": "python"}]}
    redis.store["bookmarks:insights_data:u1"] = json.dumps(cached)

    result = bookmarks.get_bookmarked_insights_with_categories("u1")

    assert result == cached


def test_get_bookmarked_insights_with_categories_empty_bookmarks(monkeypatch, fake_deps):
    redis, _, _ = fake_deps
    user = SimpleNamespace(user_id="u1", favourite_insights=[])

    session = FakeSession(get_results=[user])
    monkeypatch.setattr(bookmarks, "Session", lambda engine: session)

    result = bookmarks.get_bookmarked_insights_with_categories("u1")

    assert result == {"bookmarked_insights": [], "favourite_categories": []}
    assert json.loads(redis.store["bookmarks:insights_data:u1"]) == result


def test_get_bookmarked_insights_with_categories_db_path(monkeypatch, fake_deps):
    redis, posthog, _ = fake_deps
    user = SimpleNamespace(user_id="u1", favourite_insights=[11, 12])

    insight1 = SimpleNamespace(
        id=11,
        book_name="Book A",
        category_name="python",
        category_icon="🐍",
        title="Step 1",
        description="Desc 1",
        detailed_breakdown="Breakdown 1",
    )
    insight2 = SimpleNamespace(
        id=12,
        book_name="Book B",
        category_name="ai",
        category_icon="🤖",
        title="Step 2",
        description="Desc 2",
        detailed_breakdown="Breakdown 2",
    )

    session = FakeSession(get_results=[user], exec_results=[[insight1, insight2]])
    monkeypatch.setattr(bookmarks, "Session", lambda engine: session)

    result = bookmarks.get_bookmarked_insights_with_categories("u1")

    assert result["insights"] == [
        {
            "step_id": 11,
            "book_name": "Book A",
            "category": "python",
            "icon": "🐍",
            "title": "Step 1",
            "description": "Desc 1",
            "detailed_breakdown": "Breakdown 1",
        },
        {
            "step_id": 12,
            "book_name": "Book B",
            "category": "ai",
            "icon": "🤖",
            "title": "Step 2",
            "description": "Desc 2",
            "detailed_breakdown": "Breakdown 2",
        },
    ]
    assert {c["name"] for c in result["categories"]} == {"python", "ai"}
    assert "bookmarks:insights_data:u1" in redis.store
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["event"] == "viewed_bookmarked_insights"