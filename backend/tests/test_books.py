import json
from unittest.mock import MagicMock

import fakeredis
import pytest
from fastapi import HTTPException

from controllers.book_controller import BookService
from tests.factories import BookFactory


@pytest.fixture
def service_deps():
    redis = fakeredis.FakeRedis(decode_responses=True)
    repo = MagicMock()
    embed_callback = MagicMock()
    processor_class = MagicMock()
    load_json_func = MagicMock(
        return_value={
            "python": {"icon": "🐍", "description": "Python desc"},
            "ai": {"icon": "🤖", "description": "AI desc"},
        }
    )

    service = BookService(
        redis_client=redis,
        book_repo=repo,
        embed_callback=embed_callback,
        processor_class=processor_class,
        load_json_func=load_json_func,
    )

    return redis, repo, embed_callback, processor_class, load_json_func, service


@pytest.mark.unit
def test_get_all_books_uses_cache(service_deps):
    redis, _, _, _, _, service = service_deps
    redis.set("books:all", json.dumps([{"id": 1, "title": "Cached Book"}]))

    result = service.get_all_books(user_id="u1")

    assert result == [{"id": 1, "title": "Cached Book"}]


@pytest.mark.unit
def test_get_all_books_reads_db_and_caches(service_deps):
    redis, repo, _, _, _, service = service_deps

    book = BookFactory.build(
        id=1,
        title="Book A",
        author="Author A",
        thumbnail="thumb.png",
        description="desc",
        category=["python", "ai"],
        content={},
    )

    repo.get_all_books.return_value = [book]

    result = service.get_all_books(user_id="u1")

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
    assert redis.exists("books:all") == 1


@pytest.mark.unit
def test_find_books_by_categories_cache_hit(service_deps):
    redis, _, _, _, _, service = service_deps

    cached = {"books": [{"id": 1}], "categories": []}
    redis.set("books_with_cats:python", json.dumps(cached))

    result = service.find_books_by_categories(["python"], user_id="u1")

    assert result == cached


@pytest.mark.unit
@pytest.mark.parametrize(
    "search_categories, expected_book_ids, expected_cache_key",
    [
        (["python"], [1, 2], "books_with_cats:python"),
        (["python", "ai"], [1, 2], "books_with_cats:ai,python"),
        ([], [1, 2], "books_with_cats:all"),
        (["rust"], [], "books_with_cats:rust"),
    ],
)
def test_find_books_by_categories_matrix(
    service_deps,
    search_categories,
    expected_book_ids,
    expected_cache_key,
):
    redis, repo, _, _, _, service = service_deps

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

    if not search_categories:
        repo.get_books_by_categories.return_value = [book1, book2]
    elif "rust" in search_categories:
        repo.get_books_by_categories.return_value = []
    else:
        repo.get_books_by_categories.return_value = [book1, book2]

    result = service.find_books_by_categories(search_categories, user_id="u1")

    assert [b["id"] for b in result["books"]] == expected_book_ids
    assert redis.exists(expected_cache_key) == 1

    if expected_book_ids:
        assert {c["name"] for c in result["categories"]} == {"python", "ai"}
    else:
        assert result == {"books": [], "categories": []}


@pytest.mark.unit
def test_get_book_info_returns_404_for_missing_book(service_deps):
    _, repo, _, _, _, service = service_deps
    repo.get_book_by_title.return_value = None

    with pytest.raises(HTTPException) as exc:
        service.get_book_info("Missing Book", user_id="u1")

    assert exc.value.status_code == 404
    assert exc.value.detail == "Book not found"


@pytest.mark.unit
def test_get_book_info_reads_db_and_counts(service_deps):
    redis, repo, _, _, _, service = service_deps

    book = BookFactory.build(
        id=1,
        title="Book A",
        category=["python", "ai"],
        content={
            "python": {"steps": [1, 2]},
            "ai": {"steps": [3]},
        },
    )

    repo.get_book_by_title.return_value = book

    result = service.get_book_info("Book A", user_id="u1")

    assert result["title"] == "Book A"
    assert result["sub_categories_count"] == 2
    assert result["total_insights"] == 3
    assert result["categories"] == "python, ai"
    assert redis.exists("book:info:Book A") == 1


@pytest.mark.unit
def test_create_book_embeds_and_invalidates_cache(service_deps):
    redis, repo, embed_callback, _, _, service = service_deps
    redis.set("books:all", "cached")

    repo.create_book_transaction.return_value = 2

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

    result = service.create_book(book_data, user_id="system")

    assert result == {"message": "Book and associated steps created successfully"}
    repo.create_book_transaction.assert_called_once_with(
        book_data=book_data,
        embed_callback=embed_callback,
    )
    assert redis.exists("books:all") == 0


@pytest.mark.unit
def test_process_book_calls_processor_and_create_book(service_deps):
    _, _, _, processor_class, _, service = service_deps

    processor_instance_mock = MagicMock()
    processor_instance_mock.process.return_value = {"Title": "Processed Book"}
    processor_class.return_value = processor_instance_mock

    create_mock = MagicMock(return_value={"message": "ok"})
    service.create_book = create_mock

    result = service.process_book(
        pdf_path="file.pdf",
        book_title="Title",
        author="Author",
        description="Desc",
        cover_url="cover.png",
        category_list=["python"],
        user_id="u1",
    )

    assert result == {"message": "ok"}
    processor_class.assert_called_once_with(
        "file.pdf",
        "Title",
        "Author",
        "Desc",
        "cover.png",
        ["python"],
    )
    processor_instance_mock.process.assert_called_once()
    create_mock.assert_called_once_with({"Title": "Processed Book"}, user_id="u1")


@pytest.mark.unit
def test_process_book_failure(service_deps):
    _, _, _, processor_class, _, service = service_deps

    processor_instance_mock = MagicMock()
    processor_instance_mock.process.side_effect = Exception("PDF failed")
    processor_class.return_value = processor_instance_mock

    with pytest.raises(Exception) as exc:
        service.process_book(
            pdf_path="bad.pdf",
            book_title="Book",
            author="Author",
            description="Desc",
            cover_url="cover",
            category_list=["python"],
            user_id="u1",
        )

    assert "PDF failed" in str(exc.value)