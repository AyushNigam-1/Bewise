from fastapi import APIRouter, HTTPException, Response, Request, Body, Cookie
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Union
from enum import Enum
from controllers.user_handler import (
    get_me_logic,
    register_user_logic,
    login_user_logic,
    refresh_token_logic,
    logout_logic,
    request_reset_logic,
    reset_password_logic,
    toggle_bookmark_book_logic,
    toggle_bookmark_insight_logic,
    recommend_logic,
    session_recommend_logic,
    get_bookmarked_books_with_categories_logic,
    get_bookmarked_insights_with_categories_logic
)

router = APIRouter()

class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfile(BaseModel):
    name: str
    email: str
    favourite_books: List[int]
    favourite_insights: List[Union[dict, str]]

class SessionRecommendRequest(BaseModel):
    insight_id: int
    user_id: int

class BookmarkType(str, Enum):
    books = "books"
    insights = "insights"
# --- Routes ---
@router.get("/me")
def me(access_token: str = Cookie(None)):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return get_me_logic(access_token)

@router.post("/register")
def register_user(user: UserRegister):
    return register_user_logic(user.name, user.email, user.password)

@router.post("/login")
def login_user(user: UserLogin, response: Response):
    auth_data = login_user_logic(user.email, user.password)

    # Attach cookies to the response
    res = JSONResponse({"user_id": auth_data["user_id"]})
    res.set_cookie("access_token", auth_data["access_token"], httponly=True, samesite="Lax")
    res.set_cookie("refresh_token", auth_data["refresh_token"], httponly=True, samesite="Lax")
    
    return res

@router.post("/refresh")
def refresh_token(request: Request, response: Response):
    refresh_token_cookie = request.cookies.get("refresh_token")
    if not refresh_token_cookie:
        raise HTTPException(status_code=401, detail="No refresh token")

    new_access_token = refresh_token_logic(refresh_token_cookie)
    response.set_cookie("access_token", new_access_token, httponly=True, samesite="Lax")

    return {"ok": True}

@router.post("/logout")
def logout(request: Request, response: Response):
    refresh_token_cookie = request.cookies.get("refresh_token")
    if refresh_token_cookie:
        logout_logic(refresh_token_cookie)

    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")

    return {"ok": True}

@router.post("/password/request-reset")
def request_reset(email: str = Body(...)):
    return request_reset_logic(email)

@router.post("/password/reset")
def reset_password(token: str = Body(...), new_password: str = Body(...)):
    return reset_password_logic(token, new_password)

@router.post("/bookmark/book/{user_id}/{book_id}")
def toggle_bookmark_book(user_id: int, book_id: int):
    return toggle_bookmark_book_logic(user_id, book_id)

@router.post("/bookmark/insight/{user_id}/{insight_id}")
def toggle_bookmark_insight(user_id: int, insight_id: int):
    return toggle_bookmark_insight_logic(user_id, insight_id)

@router.get("/recommend/{user_id}")
def recommend(user_id: int):
    return recommend_logic(user_id)

@router.post("/insights/session-recommend")
def session_recommend(payload: SessionRecommendRequest):
    return session_recommend_logic(payload.user_id, payload.insight_id)

# 2. The single, dynamic route
@router.get("/bookmarks/{item_type}/{user_id}")
def get_bookmarks(item_type: BookmarkType, user_id: int):
    if item_type == BookmarkType.books:
        return get_bookmarked_books_with_categories_logic(user_id)
    elif item_type == BookmarkType.insights:
        return get_bookmarked_insights_with_categories_logic(user_id)