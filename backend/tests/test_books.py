import json
from unittest.mock import MagicMock, patch

import controllers.book_controller as books
import pytest
from fastapi import HTTPException

from tests.factories import BookFactory, InsightFactory


@pytest.fixture
def module_deps(monkeypatch, base_fake_deps):
    """
    Injects FakeRedis, PostHog, and Sentry from the global conftest into the controller.
    """
    redis = base_fake_deps["redis"]
    posthog = base_fake_deps["posthog"]

    # Patch the book_controller specifically
    monkeypatch.setattr(books, "redis_client", redis)
    monkeypatch.setattr(books, "posthog", posthog)
    monkeypatch.setattr(books, "CACHE_TTL", 123)

    return redis, posthog


def test_get_all_books_uses_cache(module_deps):
    redis, posthog = module_deps
    redis.set("books:all", json.dumps([{"id": 1, "title": "Cached Book"}]))

    result = books.get_all_books(user_id="u1")

    assert result == [{"id": 1, "title": "Cached Book"}]
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "redis_cache"


@patch("controllers.book_controller.BookRepository")
def test_get_all_books_reads_db_and_caches(mock_repo, module_deps):
    redis, posthog = module_deps

    book = BookFactory.build(
        id=1,
        title="Book A",
        author="Author A",
        thumbnail="thumb.png",
        description="desc",
        category=["python", "ai"],
        content={},
    )

    mock_repo.get_all_books.return_value = [book]

    result = books.get_all_books(user_id="u1")

    assert result == [
        {
            "id": book.id,
            "title": "Book A",
            "author": "Author A",
            "thumbnail": "thumb.png",
            "description": "desc",
            "category": ["python", "ai"],
        }
    ]
    assert redis.exists("books:all")
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "database"


def test_find_books_by_categories_cache_hit(module_deps):
    redis, _ = module_deps

    cached = {"books": [{"id": 1}], "categories": []}
    redis.set("books_with_cats:python", json.dumps(cached))

    result = books.find_books_by_categories(["python"])

    assert result == cached


@pytest.mark.parametrize(
    "search_categories, expected_book_ids, expected_cache_key",
    [
        (["python"], [1, 2], "books_with_cats:python"),
        (["python", "ai"], [1, 2], "books_with_cats:ai,python"),
        ([], [1, 2], "books_with_cats:all"),
        (["rust"], [], "books_with_cats:rust"),
    ],
)
@patch("controllers.book_controller.BookRepository")
def test_find_books_by_categories_matrix(
    mock_repo,
    monkeypatch,
    module_deps,
    search_categories,
    expected_book_ids,
    expected_cache_key,
):
    redis, posthog = module_deps

    # 1. Arrange: Setup our factory DB data
    book1 = BookFactory.build(
        id=1,
        title="Book A",
        category=["python", "ai"],
        content={"python": {"steps": [1]}, "ai": {"steps": [2]}},
    )
    book2 = BookFactory.build(
        id=2,
        title="Book B",
        category=["python"],
        content={"python": {"steps": [3]}},
    )

    # Dynamic mock logic based on the test parameters
    if not search_categories:
        mock_repo.get_books_by_categories.return_value = [book1, book2]
    elif "rust" in search_categories:
        mock_repo.get_books_by_categories.return_value = []
    else:
        mock_repo.get_books_by_categories.return_value = [book1, book2]

    # Mock the category helper
    monkeypatch.setattr(
        books,
        "load_json_file",
        lambda *args, **kwargs: {
            "python": {"icon": "🐍", "description": "Python desc"},
            "ai": {"icon": "🤖", "description": "AI desc"},
        },
    )

    # 2. Act
    result = books.find_books_by_categories(search_categories, user_id="u1")

    # 3. Assert
    assert [b["id"] for b in result["books"]] == expected_book_ids
    assert redis.exists(expected_cache_key)
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "database"


@patch("controllers.book_controller.BookRepository")
def test_get_book_info_returns_404_for_missing_book(mock_repo, module_deps):
    _, posthog = module_deps

    mock_repo.get_book_by_title.return_value = None

    with pytest.raises(HTTPException) as exc:
        books.get_book_info("Missing Book", user_id="u1")

    assert exc.value.status_code == 404
    assert exc.value.detail == "Book not found"
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["event"] == "book_not_found"


@patch("controllers.book_controller.BookRepository")
def test_get_book_info_reads_db_and_counts(mock_repo, module_deps):
    redis, posthog = module_deps

    book = BookFactory.build(
        id=1,
        title="Book A",
        category=["python", "ai"],
        content={
            "python": {"steps": [1, 2]},
            "ai": {"steps": [3]},
        },
    )

    mock_repo.get_book_by_title.return_value = book

    result = books.get_book_info("Book A", user_id="u1")

    assert result["title"] == "Book A"
    assert result["sub_categories_count"] == 2
    assert result["total_insights"] == 3
    assert result["categories"] == "python, ai"
    assert redis.exists("book:info:Book A")
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "database"


@patch("controllers.book_controller.BookRepository")
def test_get_book_content_book_not_found(mock_repo, module_deps):
    mock_repo.get_book_by_title.return_value = None

    with pytest.raises(HTTPException) as exc:
        books.get_book_content("Missing")

    assert exc.value.status_code == 404
    assert exc.value.detail == "Book not found"


@patch("controllers.book_controller.BookRepository")
def test_get_book_content_returns_keys_and_values(mock_repo, module_deps):
    redis, posthog = module_deps

    book = BookFactory.build(
        id=1,
        title="Book A",
        category=["python", "ai"],
        content={
            "python": {"icon": "🐍", "description": "Python desc", "steps": [1, 2]},
            "ai": {"icon": "🤖", "description": "AI desc", "steps": [3]},
        },
    )

    insight1 = InsightFactory.build(
        id=1,
        book_name="Book A",
        category_name="python",
        category_icon="🐍",
        title="Step 1",
        description="D1",
        detailed_breakdown="B1",
    )
    insight2 = InsightFactory.build(
        id=2,
        book_name="Book A",
        category_name="python",
        category_icon="🐍",
        title="Step 2",
        description="D2",
        detailed_breakdown="B2",
    )
    insight3 = InsightFactory.build(
        id=3,
        book_name="Book A",
        category_name="ai",
        category_icon="🤖",
        title="Step 3",
        description="D3",
        detailed_breakdown="B3",
    )

    mock_repo.get_book_by_title.return_value = book
    mock_repo.get_insights_by_ids.return_value = [insight1, insight2, insight3]

    result = books.get_book_content("Book A", category=["python"], user_id="u1")

    assert result["keys"] == [
        {
            "name": "python",
            "icon": "🐍",
            "description": "Python desc",
            "steps_count": "2",
        },
        {"name": "ai", "icon": "🤖", "description": "AI desc", "steps_count": "1"},
    ]
    assert result["values"] == [
        {
            "icon": "🐍",
            "category": "python",
            "step_id": 1,
            "step": "Step 1",
            "description": "D1",
        },
        {
            "icon": "🐍",
            "category": "python",
            "step_id": 2,
            "step": "Step 2",
            "description": "D2",
        },
    ]
    assert redis.exists("book:content_combined:Book A:python")
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "database"


def test_get_step_details_uses_cache(module_deps):
    redis, posthog = module_deps
    redis.set(
        "insight:7",
        json.dumps(
            {
                "step_id": 7,
                "book_name": "Book A",
                "category": "python",
                "title": "Cached Step",
                "description": "Cached",
                "detailed_breakdown": "Cached breakdown",
                "category_icon": "🐍",
            }
        ),
    )

    result = books.get_step_details(7, user_id="u1")

    assert result["title"] == "Cached Step"
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["book_title"] == "Book A"


@patch("controllers.book_controller.BookRepository")
def test_get_step_details_db(mock_repo, module_deps):
    insight = InsightFactory.build(
        id=1,
        book_name="Book A",
        category_name="python",
        title="Step 1",
    )

    mock_repo.get_insight_by_id.return_value = insight

    result = books.get_step_details(1)

    assert result["step_id"] == 1
    assert result["title"] == "Step 1"
    assert result["book_name"] == "Book A"
    assert result["category"] == "python"


@patch("controllers.book_controller.BookRepository")
def test_get_step_details_not_found(mock_repo, module_deps):
    mock_repo.get_insight_by_id.return_value = None

    with pytest.raises(HTTPException) as exc:
        books.get_step_details(999)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Step not found"


@patch("controllers.book_controller.BookRepository")
def test_create_book_embeds_and_invalidates_cache(mock_repo, module_deps):
    redis, posthog = module_deps
    redis.set("books:all", "cached")

    mock_repo.create_book_transaction.return_value = 2

    book_data = {
        "Title": "New Book",
        "Author": "Some Author",
        "Description": "A book",
        "Thumbnail": "cover.png",
        "Category": ["python", "ai"],
        "Content": {
            "python": {
                "icon": "🐍",
                "description": "Python section",
                "steps": [
                    {
                        "step": "Step 1",
                        "description": "Desc 1",
                        "detailed_breakdown": "Breakdown 1",
                    }
                ],
            },
            "ai": {
                "icon": "🤖",
                "description": "AI section",
                "steps": [
                    {
                        "step": "Step 2",
                        "description": "Desc 2",
                        "detailed_breakdown": "Breakdown 2",
                    }
                ],
            },
        },
    }

    result = books.create_book(book_data, user_id="system")

    assert result == {"message": "Book and associated steps created successfully"}
    mock_repo.create_book_transaction.assert_called_once()
    assert redis.exists("books:all") == 0
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["event"] == "book_created_and_embedded"


def test_process_book_calls_processor_and_create_book(monkeypatch, module_deps):
    _, posthog = module_deps

    processor_mock = MagicMock()
    processor_mock.process.return_value = {"Title": "Processed Book"}
    create_mock = MagicMock(return_value={"message": "ok"})

    monkeypatch.setattr(
        books, "BookistProcessor", MagicMock(return_value=processor_mock)
    )
    monkeypatch.setattr(books, "create_book", create_mock)

    result = books.process_book(
        pdf_path="file.pdf",
        book_title="Title",
        author="Author",
        description="Desc",
        cover_url="cover.png",
        category_list=["python"],
        user_id="u1",
    )

    assert result == {"message": "ok"}
    books.BookistProcessor.assert_called_once()
    processor_mock.process.assert_called_once()
    create_mock.assert_called_once_with({"Title": "Processed Book"}, user_id="u1")
    assert posthog.capture.call_count >= 1


def test_process_book_failure(monkeypatch, module_deps):
    processor = MagicMock()
    processor.process.side_effect = Exception("PDF failed")

    monkeypatch.setattr(books, "BookistProcessor", MagicMock(return_value=processor))

    with pytest.raises(Exception) as exc:
        books.process_book(
            pdf_path="bad.pdf",
            book_title="Book",
            author="Author",
            description="Desc",
            cover_url="cover",
            category_list=["python"],
        )

    assert "PDF failed" in str(exc.value)
