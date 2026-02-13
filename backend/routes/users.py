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

load_dotenv()

# -------------------------------------------------------------------
# CONFIG
# -------------------------------------------------------------------

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE = timedelta(minutes=15)
REFRESH_TOKEN_EXPIRE = timedelta(days=30)

router = APIRouter()

# -------------------------------------------------------------------
# MODELS
# -------------------------------------------------------------------

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

# -------------------------------------------------------------------
# TOKEN HELPERS
# -------------------------------------------------------------------

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
        'SELECT id, name, email FROM "user" WHERE email=%s',
        (email,)
    )

    user = cur.fetchone()
    conn.close()

    if not user:
        raise HTTPException(401)

    return {
        "user_id": user[0],
        "name": user[1],
        "email": user[2]
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

# -------------------------------------------------------------------
# REGISTER
# -------------------------------------------------------------------

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


# -------------------------------------------------------------------
# REFRESH
# -------------------------------------------------------------------

@router.post("/refresh")
@router.post("/refresh")
def refresh_token(request: Request, response: Response):

    refresh = request.cookies.get("refresh_token")
    if not refresh:
        raise HTTPException(401)

    conn = connect_db()
    cur = conn.cursor()

    cur.execute(
        "SELECT user_id FROM user_sessions WHERE refresh_token=%s AND expires_at > NOW()",
        (refresh,)
    )

    row = cur.fetchone()

    if not row:
        raise HTTPException(401, "Session expired")

    user_id = row[0]

    access = create_token({"sub": user_id}, ACCESS_TOKEN_EXPIRE)

    response.set_cookie("access_token", access, httponly=True, samesite="Lax")

    return {"ok": True}


# -------------------------------------------------------------------
# LOGOUT
# -------------------------------------------------------------------

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


# -------------------------------------------------------------------
# EVERYTHING BELOW REMAINS UNCHANGED
# (your favourites / insights logic)
# -------------------------------------------------------------------
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

