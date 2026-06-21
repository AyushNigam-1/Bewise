import json
import pytest
from unittest.mock import mock_open, patch
import controllers.bookmark_controller as bookmarks
from tests.factories import BookFactory, InsightFactory


@pytest.fixture
def module_deps(patch_controller):
    return patch_controller(bookmarks)


@pytest.mark.unit
@patch("controllers.bookmark_controller.BookmarkRepository")
def test_toggle_bookmark_book_adds_book(mock_repo, module_deps):
    redis, _, _ = module_deps

    # 1. Arrange: Tell the mock repository to return a successful add action
    mock_repo.toggle_book.return_value = (True, [1, 2])
    redis.set("bookmarks:books_data:u1", "old_cache")  # Pre-populate cache

    # 2. Act
    result = bookmarks.toggle_bookmark_book("u1", 2)

    # 3. Assert
    assert result == {"bookmarked": True, "favourite_books": [1, 2]}
    assert redis.exists("bookmarks:books_data:u1") == 0  # Proves cache was deleted!


@pytest.mark.unit
@patch("controllers.bookmark_controller.BookmarkRepository")
def test_toggle_bookmark_book_removes_book(mock_repo, module_deps):
    redis, _, _ = module_deps

    # Arrange: Tell the mock repository to return a successful remove action
    mock_repo.toggle_book.return_value = (False, [1])
    redis.set("bookmarks:books_data:u1", "old_cache")

    # Act
    result = bookmarks.toggle_bookmark_book("u1", 2)

    # Assert
    assert result == {"bookmarked": False, "favourite_books": [1]}
    assert redis.exists("bookmarks:books_data:u1") == 0


@pytest.mark.unit
@patch("controllers.bookmark_controller.BookmarkRepository")
def test_toggle_bookmark_insight_adds_and_clears_related_cache(mock_repo, module_deps):
    redis, _, _ = module_deps
    mock_repo.toggle_insight.return_value = (True, [10, 20])

    # Pre-populate all the caches the insight toggle is supposed to nuke
    redis.set("bookmarks:insights_data:u1", "old")
    redis.set("recommend:u1", "old")
    redis.set("session_recommend:u1:1", "a")
    redis.set("session_recommend:u1:2", "b")

    result = bookmarks.toggle_bookmark_insight("u1", 20)

    assert result == {"bookmarked": True, "favourite_insights": [10, 20]}

    # Assert ALL caches were cleared
    assert redis.exists("bookmarks:insights_data:u1") == 0
    assert redis.exists("recommend:u1") == 0
    assert redis.exists("session_recommend:u1:1") == 0
    assert redis.exists("session_recommend:u1:2") == 0


@pytest.mark.unit
def test_get_bookmarked_books_with_categories_uses_cache(module_deps):
    redis, _, _ = module_deps
    cached = {"books": [{"id": 1}], "categories": [{"name": "python"}]}
    
    # fakeredis uses standard .set() and .get()
    redis.set("bookmarks:books_data:u1", json.dumps(cached))

    result = bookmarks.get_bookmarked_books_with_categories("u1")

    assert result == cached


@pytest.mark.unit
@patch("controllers.bookmark_controller.BookmarkRepository")
def test_get_bookmarked_books_with_categories_empty_bookmarks(mock_repo, module_deps):
    redis, _, _ = module_deps

    # Tell the repo that this user has no books
    mock_repo.get_bookmarked_books.return_value = []

    result = bookmarks.get_bookmarked_books_with_categories("u1")

    assert result == {"bookmarked_books": [], "favourite_categories": []}
    assert json.loads(redis.get("bookmarks:books_data:u1")) == result


@pytest.mark.unit
@patch("controllers.bookmark_controller.BookmarkRepository")
def test_get_bookmarked_books_with_categories_db_path(mock_repo, module_deps):
    redis, _, _ = module_deps

    # Create factory SQLModel objects to return from the repo
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

    mock_repo.get_bookmarked_books.return_value = [book1, book2]

    # Mock the category helper
    monkeypatch_json = json.dumps(
        {
            "python": {"icon": "🐍", "description": "Python desc"},
            "ai": {"icon": "🤖", "description": "AI desc"},
        }
    )

    with (
        patch("builtins.open", mock_open(read_data=monkeypatch_json)),
        patch(
            "controllers.bookmark_controller.get_category_details_from_json"
        ) as mock_cat_helper,
    ):
        mock_cat_helper.side_effect = lambda cat_name, data: {
            "name": cat_name,
            "icon": "📌",
            "description": f"{cat_name} desc",
        }

        result = bookmarks.get_bookmarked_books_with_categories("u1")

    # Verify controller transformed the repo data properly
    assert len(result["books"]) == 2
    assert result["books"][0]["id"] == 1
    assert {c["name"] for c in result["categories"]} == {"python", "ai"}

    # Verify cache was set
    assert redis.exists("bookmarks:books_data:u1") == 1


@pytest.mark.unit
def test_get_bookmarked_insights_with_categories_uses_cache(module_deps):
    redis, _, _ = module_deps
    cached = {"insights": [{"step_id": 1}], "categories": [{"name": "python"}]}
    redis.set("bookmarks:insights_data:u1", json.dumps(cached))

    result = bookmarks.get_bookmarked_insights_with_categories("u1")

    assert result == cached


@pytest.mark.unit
@patch("controllers.bookmark_controller.BookmarkRepository")
def test_get_bookmarked_insights_with_categories_empty_bookmarks(
    mock_repo, module_deps
):
    redis, _, _ = module_deps
    mock_repo.get_bookmarked_insights.return_value = []

    result = bookmarks.get_bookmarked_insights_with_categories("u1")

    assert result == {"bookmarked_insights": [], "favourite_categories": []}
    assert json.loads(redis.get("bookmarks:insights_data:u1")) == result


@pytest.mark.unit
@patch("controllers.bookmark_controller.BookmarkRepository")
def test_get_bookmarked_insights_with_categories_db_path(mock_repo, module_deps):
    redis, _, _ = module_deps

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

    mock_repo.get_bookmarked_insights.return_value = [insight1, insight2]

    result = bookmarks.get_bookmarked_insights_with_categories("u1")

    assert len(result["insights"]) == 2
    assert result["insights"][0]["step_id"] == 11
    assert {c["name"] for c in result["categories"]} == {"python", "ai"}

    assert redis.exists("bookmarks:insights_data:u1") == 1