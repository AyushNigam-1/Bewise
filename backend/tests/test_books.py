import json
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

import controllers.book_handler as books


class DummyRedis:
    def __init__(self):
        self.store = {}
        self.deleted = []

    def get(self, key):
        return self.store.get(key)

    def setex(self, key, ttl, value):
        self.store[key] = value

    def scan_iter(self, pattern):
        prefix = pattern.replace("*", "")
        return [k for k in list(self.store.keys()) if k.startswith(prefix)]

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
    def __init__(self, exec_results=None, get_result=None):
        self.exec_results = list(exec_results or [])
        self.get_result = get_result
        self.added = []
        self.committed = False
        self.flush_calls = 0

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def exec(self, statement):
        if not self.exec_results:
            raise AssertionError("Unexpected exec() call")
        return FakeResult(self.exec_results.pop(0))

    def get(self, model, pk):
        return self.get_result

    def add(self, obj):
        self.added.append(obj)

    def flush(self):
        self.flush_calls += 1
        next_id = 1
        for obj in self.added:
            if getattr(obj, "id", None) is None:
                obj.id = next_id
                next_id += 1

    def commit(self):
        self.committed = True


@pytest.fixture
def fake_deps(monkeypatch):
    redis = DummyRedis()
    posthog = MagicMock()

    monkeypatch.setattr(books, "redis_client", redis)
    monkeypatch.setattr(books, "posthog", posthog)
    monkeypatch.setattr(books, "CACHE_TTL", 123)

    return redis, posthog


def test_get_all_books_uses_cache(fake_deps):
    redis, posthog = fake_deps
    redis.store["books:all"] = json.dumps([{"id": 1, "title": "Cached Book"}])

    result = books.get_all_books(user_id="u1")

    assert result == [{"id": 1, "title": "Cached Book"}]
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "redis_cache"


def test_get_all_books_reads_db_and_caches(monkeypatch, fake_deps):
    redis, posthog = fake_deps

    book = books.Book(
        title="Book A",
        author="Author A",
        thumbnail="thumb.png",
        description="desc",
        category=["python", "ai"],
        content={},
    )

    session = FakeSession(exec_results=[[book]])
    monkeypatch.setattr(books, "Session", lambda engine: session)

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
    assert "books:all" in redis.store
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "database"


def test_find_books_by_categories_cache_hit(fake_deps):
    redis, _ = fake_deps

    cached = {
        "books": [{"id": 1}],
        "categories": []
    }

    redis.store["books_with_cats:python"] = json.dumps(cached)

    result = books.find_books_by_categories(["python"])

    assert result == cached


def test_find_books_by_categories_builds_books_and_categories(monkeypatch, fake_deps):
    redis, posthog = fake_deps

    book1 = books.Book(
        title="Book A",
        author="Author A",
        thumbnail="thumb-a.png",
        description="desc a",
        category=["python", "ai"],
        content={"python": {"steps": [1, 2]}},
    )
    book2 = books.Book(
        title="Book B",
        author="Author B",
        thumbnail="thumb-b.png",
        description="desc b",
        category=["python"],
        content={"python": {"steps": [3]}},
    )

    session = FakeSession(exec_results=[[book1, book2]])
    monkeypatch.setattr(books, "Session", lambda engine: session)
    monkeypatch.setattr(
        books,
        "load_json_file",
        lambda *args, **kwargs: {
            "python": {"icon": "🐍", "description": "Python desc"},
            "ai": {"icon": "🤖", "description": "AI desc"},
        },
    )

    result = books.find_books_by_categories(["python"], user_id="u1")

    assert len(result["books"]) == 2
    assert result["categories"] == [
        {"name": "ai", "icon": "🤖", "description": "AI desc"},
        {"name": "python", "icon": "🐍", "description": "Python desc"},
    ]
    assert "books_with_cats:python" in redis.store
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "database"


def test_get_book_info_returns_404_for_missing_book(monkeypatch, fake_deps):
    _, posthog = fake_deps

    session = FakeSession(exec_results=[[None]])
    monkeypatch.setattr(books, "Session", lambda engine: session)

    with pytest.raises(HTTPException) as exc:
        books.get_book_info("Missing Book", user_id="u1")

    assert exc.value.status_code == 404
    assert exc.value.detail == "Book not found"
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["event"] == "book_not_found"


def test_get_book_info_reads_db_and_counts(monkeypatch, fake_deps):
    redis, posthog = fake_deps

    book = books.Book(
        title="Book A",
        author="Author A",
        thumbnail="thumb.png",
        description="desc",
        category=["python", "ai"],
        content={
            "python": {"steps": [1, 2]},
            "ai": {"steps": [3]},
        },
    )

    session = FakeSession(exec_results=[[book]])
    monkeypatch.setattr(books, "Session", lambda engine: session)

    result = books.get_book_info("Book A", user_id="u1")

    assert result["title"] == "Book A"
    assert result["sub_categories_count"] == 2
    assert result["total_insights"] == 3
    assert result["categories"] == "python, ai"
    assert "book:info:Book A" in redis.store
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "database"


def test_get_book_content_book_not_found(monkeypatch, fake_deps):
    session = FakeSession(exec_results=[[]])
    monkeypatch.setattr(books, "Session", lambda engine: session)

    with pytest.raises(HTTPException) as exc:
        books.get_book_content("Missing")

    assert exc.value.status_code == 404
    assert exc.value.detail == "Book not found"


def test_get_book_content_returns_keys_and_values(monkeypatch, fake_deps):
    redis, posthog = fake_deps

    book = books.Book(
        title="Book A",
        author="Author A",
        thumbnail="thumb.png",
        description="desc",
        category=["python", "ai"],
        content={
            "python": {"icon": "🐍", "description": "Python desc", "steps": [1, 2]},
            "ai": {"icon": "🤖", "description": "AI desc", "steps": [3]},
        },
    )

    insight1 = books.Insight(
        id=1,
        book_name="Book A",
        category_name="python",
        category_icon="🐍",
        title="Step 1",
        description="D1",
        detailed_breakdown="B1",
    )
    insight2 = books.Insight(
        id=2,
        book_name="Book A",
        category_name="python",
        category_icon="🐍",
        title="Step 2",
        description="D2",
        detailed_breakdown="B2",
    )
    insight3 = books.Insight(
        id=3,
        book_name="Book A",
        category_name="ai",
        category_icon="🤖",
        title="Step 3",
        description="D3",
        detailed_breakdown="B3",
    )

    session = FakeSession(exec_results=[[book], [insight1, insight2, insight3]])
    monkeypatch.setattr(books, "Session", lambda engine: session)

    result = books.get_book_content("Book A", category=["python"], user_id="u1")

    assert result["keys"] == [
        {"name": "python", "icon": "🐍", "description": "Python desc", "steps_count": "2"},
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
    assert "book:content_combined:Book A:python" in redis.store
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["source"] == "database"


def test_get_step_details_uses_cache(fake_deps):
    redis, posthog = fake_deps
    redis.store["insight:7"] = json.dumps(
        {
            "step_id": 7,
            "book_name": "Book A",
            "category": "python",
            "title": "Cached Step",
            "description": "Cached",
            "detailed_breakdown": "Cached breakdown",
            "category_icon": "🐍",
        }
    )

    result = books.get_step_details(7, user_id="u1")

    assert result["title"] == "Cached Step"
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["properties"]["book_title"] == "Book A"


def test_get_step_details_db(monkeypatch, fake_deps):
    insight = books.Insight(
        id=1,
        book_name="Book A",
        category_name="python",
        category_icon="🐍",
        title="Step 1",
        description="Desc",
        detailed_breakdown="Breakdown",
    )

    session = FakeSession(get_result=insight)
    monkeypatch.setattr(books, "Session", lambda engine: session)

    result = books.get_step_details(1)

    assert result["step_id"] == 1
    assert result["title"] == "Step 1"
    assert result["book_name"] == "Book A"
    assert result["category"] == "python"


def test_get_step_details_not_found(monkeypatch, fake_deps):
    session = FakeSession(get_result=None)
    monkeypatch.setattr(books, "Session", lambda engine: session)

    with pytest.raises(HTTPException) as exc:
        books.get_step_details(999)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Step not found"


def test_create_book_embeds_and_invalidates_cache(monkeypatch, fake_deps):
    redis, posthog = fake_deps
    redis.store["books:all"] = "cached"

    embed_mock = MagicMock()
    monkeypatch.setattr(books, "embed_and_upsert_insight", embed_mock)

    session = FakeSession()
    monkeypatch.setattr(books, "Session", lambda engine: session)

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
    assert session.committed is True
    assert embed_mock.call_count == 2
    assert "books:all" not in redis.store
    posthog.capture.assert_called_once()
    assert posthog.capture.call_args.kwargs["event"] == "book_created_and_embedded"


def test_process_book_calls_processor_and_create_book(monkeypatch, fake_deps):
    _, posthog = fake_deps

    processor_mock = MagicMock()
    processor_mock.process.return_value = {"Title": "Processed Book"}

    create_mock = MagicMock(return_value={"message": "ok"})

    monkeypatch.setattr(books, "BookistProcessor", MagicMock(return_value=processor_mock))
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


def test_process_book_failure(monkeypatch, fake_deps):
    processor = MagicMock()
    processor.process.side_effect = Exception("PDF failed")

    monkeypatch.setattr(
        books,
        "BookistProcessor",
        MagicMock(return_value=processor)
    )

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