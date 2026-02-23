from fastapi import APIRouter, HTTPException, Response, Request , Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Union
import bcrypt
from jose import jwt
from fastapi import  Cookie
from datetime import datetime, timedelta
from controllers.connection import connect_db
from psycopg2.extras import Json
import os
import secrets
from dotenv import load_dotenv
from controllers.vector import recommend_for_user , recommend_next_insights

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE = timedelta(minutes=15)
REFRESH_TOKEN_EXPIRE = timedelta(days=30)

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

@router.get("/me")
def me(access_token: str = Cookie(None)):

    if not access_token:
        raise HTTPException(401)

    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload["sub"]
    except:
        raise HTTPException(401)

    conn = connect_db()
    cur = conn.cursor()

    cur.execute(
        'SELECT id, name, email , favourite_books , favourite_insights FROM "user" WHERE email=%s',
        (email,)
    )

    user = cur.fetchone()
    conn.close()

    if not user:
        raise HTTPException(401)

    return {
        "user_id": user[0],
        "name": user[1],
        "email": user[2],
        "favourite_books": user[3],
        "favourite_insights": user[4]
    }

def create_token(data: dict, exp: timedelta):
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + exp
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_user_by_email(conn, email: str):
    cur = conn.cursor()
    cur.execute(
        'SELECT id, name, email, password, favourite_insights, favourite_books FROM "user" WHERE email=%s',
        (email,)
    )
    row = cur.fetchone()
    cur.close()
    return row

@router.post("/register")
def register_user(user: UserRegister):

    conn = connect_db()
    if not conn:
        raise HTTPException(500)

    hashed = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt()).decode()

    try:
        cur = conn.cursor()
        cur.execute(
            'INSERT INTO "user"(name,email,password) VALUES(%s,%s,%s) RETURNING id',
            (user.name, user.email, hashed)
        )

        user_id = cur.fetchone()[0]
        conn.commit()

        return {"user_id": user_id}

    except Exception as e:
        raise HTTPException(400,str(e))

    finally:
        conn.close()

# -------------------------------------------------------------------
# LOGIN
# -------------------------------------------------------------------
@router.post("/login")
def login_user(user: UserLogin, response: Response):

    conn = connect_db()
    cur = conn.cursor()

    db_user = get_user_by_email(conn, user.email)

    if not db_user or not bcrypt.checkpw(user.password.encode(), db_user[3].encode()):
        raise HTTPException(401, "Invalid credentials")

    user_id = db_user[0]

    # 🔥 Kill all existing sessions (single-device policy)
    cur.execute("DELETE FROM user_sessions WHERE user_id=%s", (user_id,))

    access = create_token({"sub": user.email}, ACCESS_TOKEN_EXPIRE)
    refresh = secrets.token_urlsafe(64)

    # Save new session
    cur.execute("""
        INSERT INTO user_sessions(user_id, refresh_token, expires_at)
        VALUES(%s,%s,%s)
    """, (user_id, refresh, datetime.utcnow() + REFRESH_TOKEN_EXPIRE))

    conn.commit()
    conn.close()

    res = JSONResponse({"user_id": user_id})

    res.set_cookie("access_token", access, httponly=True, samesite="Lax")
    res.set_cookie("refresh_token", refresh, httponly=True, samesite="Lax")

    return res

@router.post("/refresh")
def refresh_token(request: Request, response: Response):

    refresh = request.cookies.get("refresh_token")
    if not refresh:
        raise HTTPException(401)

    conn = connect_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT u.email 
        FROM user_sessions s
        JOIN "user" u ON s.user_id = u.id
        WHERE s.refresh_token=%s AND s.expires_at > NOW()
    """, (refresh,))

    row = cur.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(401, "Session expired")
    email = row[0] 

    access = create_token({"sub": email}, ACCESS_TOKEN_EXPIRE)

    response.set_cookie("access_token", access, httponly=True, samesite="Lax")

    return {"ok": True}


@router.post("/logout")
def logout(request: Request, response: Response):

    refresh = request.cookies.get("refresh_token")

    if refresh:
        conn = connect_db()
        cur = conn.cursor()
        cur.execute("DELETE FROM user_sessions WHERE refresh_token=%s", (refresh,))
        conn.commit()
        conn.close()

    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")

    return {"ok": True}

@router.post("/password/request-reset")
def request_reset(email: str = Body(...)):

    conn = connect_db()
    cur = conn.cursor()

    cur.execute('SELECT id FROM "user" WHERE email=%s', (email,))
    user = cur.fetchone()

    if not user:
        conn.close()
        raise HTTPException(404, "User not found")

    token = secrets.token_urlsafe(32)
    expiry = datetime.utcnow() + timedelta(minutes=30)

    cur.execute(
        'UPDATE "user" SET reset_token=%s, reset_expiry=%s WHERE email=%s',
        (token, expiry, email)
    )

    conn.commit()
    conn.close()

    reset_link = f"http://localhost:3000/reset-password?token={token}"

    print("RESET LINK:", reset_link)

    return {"message": "Reset link sent"}


@router.post("/password/reset")
def reset_password(token: str = Body(...), new_password: str = Body(...)):

    conn = connect_db()
    cur = conn.cursor()

    cur.execute(
        'SELECT id FROM "user" WHERE reset_token=%s AND reset_expiry > NOW()',
        (token,)
    )

    user = cur.fetchone()

    if not user:
        conn.close()
        raise HTTPException(400, "Invalid or expired token")

    user_id = user[0]

    hashed = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()

    # Update password + clear reset fields
    cur.execute(
        '''
        UPDATE "user"
        SET password=%s,
            reset_token=NULL,
            reset_expiry=NULL
        WHERE id=%s
        ''',
        (hashed, user_id)
    )

    # 🔥 NOW invalidate ALL sessions
    cur.execute(
        "DELETE FROM user_sessions WHERE user_id=%s",
        (user_id,)
    )

    conn.commit()
    conn.close()

    return {"message": "Password updated"}


@router.post("/bookmark/book/{user_id}/{book_id}")
def toggle_bookmark_book(user_id: int, book_id: int):

    conn = connect_db()
    cur = conn.cursor()

    cur.execute('SELECT favourite_books FROM "user" WHERE id=%s', (user_id,))
    row = cur.fetchone()

    books = row[0] if row and row[0] else []

    if book_id in books:
        books.remove(book_id)
        action = False
    else:
        books.append(book_id)
        action = True

    cur.execute(
        'UPDATE "user" SET favourite_books=%s WHERE id=%s',
        (books, user_id)
    )

    conn.commit()
    conn.close()

    return {
        "bookmarked":action ,
        "favourite_books": books
    }


@router.post("/bookmark/insight/{user_id}/{insight_id}")
def toggle_bookmark_insight(user_id: int, insight_id: int):

    conn = connect_db()
    cur = conn.cursor()

    cur.execute('SELECT favourite_insights FROM "user" WHERE id=%s', (user_id,))
    row = cur.fetchone()

    insights = row[0] if row and row[0] else []

    if insight_id in insights:
        insights.remove(insight_id)
        action = False

    else:
        insights.append(insight_id)
        action = True

    cur.execute(
        'UPDATE "user" SET favourite_insights=%s WHERE id=%s',
        (Json(insights), user_id)
    )

    conn.commit()
    conn.close()

    return {
        "bookmarked":action,
        "favourite_insights": insights
    }

@router.get("/recommend/{user_id}")
def recommend(user_id: int):

    conn = connect_db()
    cur = conn.cursor()

    cur.execute(
        'SELECT favourite_insights FROM "user" WHERE id=%s',
        (user_id,)
    )

    row = cur.fetchone()
    conn.close()

    insight_ids = row[0] or []

    recommendations = recommend_for_user(insight_ids)

    return {"recommendations": recommendations}

class SessionRecommendRequest(BaseModel):
    insight_id: int
    user_id: int

@router.post("/insights/session-recommend")
def session_recommend(payload: SessionRecommendRequest):

    conn = connect_db()
    cur = conn.cursor()

    # 1️⃣ Get current insight
    cur.execute(
        "SELECT title, description FROM insights WHERE id=%s",
        (payload.insight_id,)
    )
    insight_row = cur.fetchone()

    if not insight_row:
        conn.close()
        raise HTTPException(404, "Insight not found")

    title, description = insight_row

    # 2️⃣ Get user's bookmarked insights
    cur.execute(
        'SELECT favourite_insights FROM "user" WHERE id=%s',
        (payload.user_id,)
    )

    user_row = cur.fetchone()
    conn.close()

    bookmarked_ids = user_row[0] if user_row and user_row[0] else []

    # 3️⃣ Call vector recommender
    recommendations = recommend_next_insights(
        current_insight_title=title,
        current_insight_description=description,
        user_bookmarked_ids=bookmarked_ids,
        current_insight_id=payload.insight_id,
        top_k=3
    )

    return {
        "recommendations": recommendations
    }


@router.get("/bookmarks/books/{user_id}")
def get_bookmarked_books(user_id: int):
    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    try:
        cur = conn.cursor()
        
        # 1. Get the list of saved book IDs for the user
        cur.execute('SELECT favourite_books FROM "user" WHERE id=%s', (user_id,))
        row = cur.fetchone()
        book_ids = row[0] if row and row[0] else []

        # If they haven't bookmarked anything, return an empty list early
        if not book_ids:
            return {"bookmarked_books": []}

        # 2. Fetch the actual book records matching your EXACT schema
        cur.execute(
            'SELECT id, title, author, thumbnail, description, category FROM book WHERE id IN %s', 
            (tuple(book_ids),)
        )
        books_data = cur.fetchall()

        # 3. Format exactly like your /books route
        result = []
        for id, title, author, thumbnail, description, category in books_data:
            result.append({
                "id": id,
                "title": title,
                "author": author,
                "thumbnail": thumbnail,
                "description": description,
                "category": category
            })

        return {"bookmarked_books": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.get("/bookmarks/insights/{user_id}")
def get_bookmarked_insights(user_id: int):
    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    try:
        cur = conn.cursor()
        
        # 1. Get the list of saved insight IDs for the user
        cur.execute('SELECT favourite_insights FROM "user" WHERE id=%s', (user_id,))
        row = cur.fetchone()
        insight_ids = row[0] if row and row[0] else []

        # If they haven't bookmarked anything, return an empty list early
        if not insight_ids:
            return {"bookmarked_insights": []}

        # 2. Fetch the actual insight records matching your EXACT schema
        cur.execute(
            'SELECT id, book_name, category_name, title, description, detailed_breakdown FROM insights WHERE id IN %s', 
            (tuple(insight_ids),)
        )
        insights_data = cur.fetchall()

        # 3. Format exactly like your /insights/{step_id} route
        result = []
        for id, book_name, category_name, title, description, detailed_breakdown in insights_data:
            result.append({
                "step_id": id,
                "book_name": book_name,
                "category": category_name,
                "title": title,
                "description": description,
                "detailed_breakdown": detailed_breakdown
            })

        return {"bookmarked_insights": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()