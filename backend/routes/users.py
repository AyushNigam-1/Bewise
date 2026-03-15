from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Union
from enum import Enum
from controllers.user_handler import (
    get_me_logic,
    toggle_bookmark_book_logic,
    toggle_bookmark_insight_logic,
    recommend_logic,
    session_recommend_logic,
    get_bookmarked_books_with_categories_logic,
    get_bookmarked_insights_with_categories_logic
)

router = APIRouter()

class UserProfile(BaseModel):
    name: str
    email: str
    favourite_books: List[int]
    favourite_insights: List[Union[dict, str]]

class SessionRecommendRequest(BaseModel):
    insight_id: int

class BookmarkType(str, Enum):
    books = "books"
    insights = "insights"

def get_secure_user_id(request: Request) -> str:
    """Helper to grab the verified user ID from the middleware state."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user["id"]

@router.post("/bookmark/book/{book_id}")
def toggle_bookmark_book(book_id: int, request: Request):
    user_id = get_secure_user_id(request)
    return toggle_bookmark_book_logic(user_id, book_id)

@router.post("/bookmark/insight/{insight_id}")
def toggle_bookmark_insight(insight_id: int, request: Request):
    user_id = get_secure_user_id(request)
    return toggle_bookmark_insight_logic(user_id, insight_id)

@router.get("/recommend")
def recommend(request: Request):
    user_id = get_secure_user_id(request)
    return recommend_logic(user_id)

@router.post("/insights/session-recommend")
def session_recommend(payload: SessionRecommendRequest, request: Request):
    user_id = get_secure_user_id(request)
    return session_recommend_logic(user_id, payload.insight_id)

@router.get("/bookmarks/{item_type}")
def get_bookmarks(item_type: BookmarkType, request: Request):
    user_id = get_secure_user_id(request)
    
    if item_type == BookmarkType.books:
        return get_bookmarked_books_with_categories_logic(user_id)
    elif item_type == BookmarkType.insights:
        return get_bookmarked_insights_with_categories_logic(user_id)