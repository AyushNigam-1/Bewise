import json
from unittest.mock import Mock, mock_open, patch

import fakeredis
import pytest

import controllers.bookmark_controller as bookmarks
from controllers.bookmark_controller import BookmarkService
from tests.factories import BookFactory, InsightFactory


@pytest.fixture
def service_deps():
    redis = fakeredis.FakeRedis(decode_responses=True)
    repo = Mock()
    service = BookmarkService(redis_client=redis, repository=repo)
    return redis, repo, service


@pytest.mark.unit
def test_toggle_bookmark_book_adds_book(service_deps):
    redis, repo, service = service_deps

    repo.toggle_book.return_value = (True, [1, 2])
    redis.set("bookmarks:books_data:u1", "old_cache")

    result = service.toggle_bookmark_book("u1", 2)

    assert result == {"bookmarked": True, "favourite_books": [1, 2]}
    assert redis.exists("bookmarks:books_data:u1") == 0


@pytest.mark.unit
def test_toggle_bookmark_book_removes_book(service_deps):
    redis, repo, service = service_deps

    repo.toggle_book.return_value = (False, [1])
    redis.set("bookmarks:books_data:u1", "old_cache")

    result = service.toggle_bookmark_book("u1", 2)

    assert result == {"bookmarked": False, "favourite_books": [1]}
    assert redis.exists("bookmarks:books_data:u1") == 0


@pytest.mark.unit
def test_toggle_bookmark_insight_adds_and_clears_related_cache(service_deps):
    redis, repo, service = service_deps

    repo.toggle_insight.return_value = (True, [10, 20])

    redis.set("bookmarks:insights_data:u1", "old")
    redis.set("recommend:u1", "old")
    redis.set("session_recommend:u1:1", "a")
    redis.set("session_recommend:u1:2", "b")

    result = service.toggle_bookmark_insight("u1", 20)

    assert result == {"bookmarked": True, "favourite_insights": [10, 20]}
    assert redis.exists("bookmarks:insights_data:u1") == 0
    assert redis.exists("recommend:u1") == 0
    assert redis.exists("session_recommend:u1:1") == 0
    assert redis.exists("session_recommend:u1:2") == 0


@pytest.mark.unit
def test_get_bookmarked_books_with_categories_uses_cache(service_deps):
    redis, _, service = service_deps
    cached = {"books": [{"id": 1}], "categories": [{"name": "python"}]}

    redis.set("bookmarks:books_data:u1", json.dumps(cached))

    result = service.get_bookmarked_books_with_categories("u1")

    assert result == cached


@pytest.mark.unit
def test_get_bookmarked_books_with_categories_empty_bookmarks(service_deps):
    redis, repo, service = service_deps

    repo.get_bookmarked_books.return_value = []

    result = service.get_bookmarked_books_with_categories("u1")

    assert result == {"bookmarked_books": [], "favourite_categories": []}
    assert json.loads(redis.get("bookmarks:books_data:u1")) == result


@pytest.mark.unit
def test_get_bookmarked_books_with_categories_db_path(service_deps):
    redis, repo, service = service_deps

    book1 = BookFactory.build(
        id=1,
        title="Book A",
        author="Author A",
        thumbnail="thumb-a.png",
        description="desc a",
        category=["python", "ai"],
    )
    book2 = BookFactory.build(
        id=2,
        title="Book B",
        author="Author B",
        thumbnail="thumb-b.png",
        description="desc b",
        category=["python"],
    )

    repo.get_bookmarked_books.return_value = [book1, book2]

    with (
        patch("builtins.open", mock_open(read_data="{}")),
        patch("controllers.bookmark_controller.get_category_details_from_json") as mock_cat_helper,
    ):
        mock_cat_helper.side_effect = lambda cat_name, data: {
            "name": cat_name,
            "icon": "📌",
            "description": f"{cat_name} desc",
        }

        result = service.get_bookmarked_books_with_categories("u1")

    assert len(result["books"]) == 2
    assert result["books"][0]["id"] == 1
    assert {c["name"] for c in result["categories"]} == {"python", "ai"}
    assert redis.exists("bookmarks:books_data:u1") == 1


@pytest.mark.unit
def test_get_bookmarked_insights_with_categories_uses_cache(service_deps):
    redis, _, service = service_deps
    cached = {"insights": [{"step_id": 1}], "categories": [{"name": "python"}]}

    redis.set("bookmarks:insights_data:u1", json.dumps(cached))

    result = service.get_bookmarked_insights_with_categories("u1")

    assert result == cached


@pytest.mark.unit
def test_get_bookmarked_insights_with_categories_empty_bookmarks(service_deps):
    redis, repo, service = service_deps

    repo.get_bookmarked_insights.return_value = []

    result = service.get_bookmarked_insights_with_categories("u1")

    assert result == {"bookmarked_insights": [], "favourite_categories": []}
    assert json.loads(redis.get("bookmarks:insights_data:u1")) == result


@pytest.mark.unit
def test_get_bookmarked_insights_with_categories_db_path(service_deps):
    redis, repo, service = service_deps

    insight1 = InsightFactory.build(
        id=11,
        book_name="Book A",
        category_name="python",
        category_icon="🐍",
        title="Step 1",
        description="Desc 1",
        detailed_breakdown="Breakdown 1",
    )
    insight2 = InsightFactory.build(
        id=12,
        book_name="Book B",
        category_name="ai",
        category_icon="🤖",
        title="Step 2",
        description="Desc 2",
        detailed_breakdown="Breakdown 2",
    )

    repo.get_bookmarked_insights.return_value = [insight1, insight2]

    result = service.get_bookmarked_insights_with_categories("u1")

    assert len(result["insights"]) == 2
    assert result["insights"][0]["step_id"] == 11
    assert {c["name"] for c in result["categories"]} == {"python", "ai"}
    assert redis.exists("bookmarks:insights_data:u1") == 1