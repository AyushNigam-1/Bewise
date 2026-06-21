import json
from unittest.mock import patch
import controllers.book_controller as books
import pytest
from fastapi import HTTPException
from tests.factories import BookFactory, InsightFactory


@pytest.fixture
def module_deps(patch_controller):
    # Even though we're testing insights, the functions currently live in book_controller
    return patch_controller(books)


@pytest.mark.unit
@patch("controllers.book_controller.BookRepository")
def test_get_book_content_book_not_found(mock_repo, module_deps):
    _, _, _ = module_deps
    mock_repo.get_book_by_title.return_value = None

    with pytest.raises(HTTPException) as exc:
        books.get_book_content("Missing")

    assert exc.value.status_code == 404
    assert exc.value.detail == "Book not found"


@pytest.mark.unit
@patch("controllers.book_controller.BookRepository")
def test_get_book_content_returns_keys_and_values(mock_repo, module_deps):
    redis, _, _ = module_deps

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


@pytest.mark.unit
def test_get_step_details_uses_cache(module_deps):
    redis, _, _ = module_deps
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


@pytest.mark.unit
@patch("controllers.book_controller.BookRepository")
def test_get_step_details_db(mock_repo, module_deps):
    _, _, _ = module_deps
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


@pytest.mark.unit
@patch("controllers.book_controller.BookRepository")
def test_get_step_details_not_found(mock_repo, module_deps):
    _, _, _ = module_deps
    mock_repo.get_insight_by_id.return_value = None

    with pytest.raises(HTTPException) as exc:
        books.get_step_details(999)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Step not found"