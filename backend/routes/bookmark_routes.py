from fastapi import APIRouter, Request, Depends, HTTPException
from enum import Enum
from fastapi_limiter.depends import RateLimiter
from pyrate_limiter import Limiter, Rate, Duration

from controllers.bookmark_controller import (
    toggle_bookmark_book,
    toggle_bookmark_insight,
    get_bookmarked_books_with_categories,
    get_bookmarked_insights_with_categories,
)

shared_limiter = Limiter(Rate(60, Duration.SECOND * 60))
router = APIRouter(dependencies=[Depends(RateLimiter(limiter=shared_limiter))])


class BookmarkType(str, Enum):
    books = "books"
    insights = "insights"


def get_user_id(request: Request) -> str:
    return request.state.user["id"]


@router.post("/bookmark/book/{book_id}")
def toggle_bookmark_book_route(book_id: int, request: Request):
    return toggle_bookmark_book(get_user_id(request), book_id)


@router.post("/bookmark/insight/{insight_id}")
def toggle_bookmark_insight_route(insight_id: int, request: Request):
    return toggle_bookmark_insight(get_user_id(request), insight_id)


@router.get("/bookmarks/{item_type}")
def get_bookmarks_route(item_type: BookmarkType, request: Request):
    user_id = get_user_id(request)

    if item_type == BookmarkType.books:
        return get_bookmarked_books_with_categories(user_id)

    if item_type == BookmarkType.insights:
        return get_bookmarked_insights_with_categories(user_id)

    raise HTTPException(status_code=400, detail="Invalid bookmark type")