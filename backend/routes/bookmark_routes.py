from enum import Enum
from routes.utils import get_current_user_id
from core.telemetry import TelemetryRoute
from fastapi import APIRouter, HTTPException, Depends
from controllers.bookmark_controller import BookmarkService, get_bookmark_service

router = APIRouter(route_class=TelemetryRoute)

class BookmarkType(str, Enum):
    books = "books"
    insights = "insights"


@router.post("/bookmark/book/{book_id}")
def toggle_bookmark_book_route(
    book_id: int, 
    user_id: str = Depends(get_current_user_id),
    service: BookmarkService = Depends(get_bookmark_service)
):
    return service.toggle_bookmark_book(user_id, book_id)


@router.post("/bookmark/insight/{insight_id}")
def toggle_bookmark_insight_route(
    insight_id: int, 
    user_id: str = Depends(get_current_user_id),
    service: BookmarkService = Depends(get_bookmark_service)
):
    return service.toggle_bookmark_insight(user_id, insight_id)


@router.get("/bookmarks/{item_type}")
def get_bookmarks_route(
    item_type: BookmarkType, 
    user_id: str = Depends(get_current_user_id),
    service: BookmarkService = Depends(get_bookmark_service)
):
    if item_type == BookmarkType.books:
        return service.get_bookmarked_books_with_categories(user_id)

    if item_type == BookmarkType.insights:
        return service.get_bookmarked_insights_with_categories(user_id)

    raise HTTPException(status_code=400, detail="Invalid bookmark type")