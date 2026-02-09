from fastapi import APIRouter, HTTPException, Response, status , Body 
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Union
import bcrypt
from jose import jwt
import json
from datetime import datetime, timedelta
from controllers.connection import connect_db
from psycopg2.extras import Json

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

router = APIRouter()


class UserRegister(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class UserProfile(BaseModel):
    name: str
    email: str
    favourite_books: List[int]
    favourite_insights: List[Union[dict, str]]


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_user_by_email(conn, email: str):
    cur = conn.cursor()
    cur.execute("SELECT id, name, email, password, favourite_insights, favourite_books FROM \"user\" WHERE email = %s", (email,))
    user = cur.fetchone()
    cur.close()
    return user


@router.post("/register")
def register_user(user: UserRegister):
    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    salt = bcrypt.gensalt()
    hashed_pw_bytes = bcrypt.hashpw(user.password.encode('utf-8'), salt)
    hashed_pw = hashed_pw_bytes.decode('utf-8')

    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO \"user\" (name, email, password) VALUES (%s, %s, %s) RETURNING id",
            (user.name, user.email, hashed_pw)
        )
        user_id = cur.fetchone()[0]
        conn.commit()

        # Default favourites
        favourite_books = []
        favourite_insights = {}

        cur.close()
        return {
            "user_id": user_id,
            "favourite_books": favourite_books,
            "favourite_insights": favourite_insights
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@router.post("/login")
def login_user(user: UserLogin, response: Response):
    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    db_user = get_user_by_email(conn, user.email)
# checkpw requires bytes. Encode both the input password and the stored hash.
    if not db_user or not bcrypt.checkpw(user.password.encode('utf-8'), db_user[3].encode('utf-8')):
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id = db_user[0]
    favourite_insights = db_user[4] or {}
    favourite_books = db_user[5] or []
    print(db_user)
    conn.close()

    token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    res = JSONResponse(
        content={
            "user_id": user_id,
            "favourite_books": favourite_books,
            "favourite_insights": favourite_insights
        },
        status_code=status.HTTP_200_OK
    )

    res.set_cookie(
        key="access_token",
        value=token,
        httponly=False,
        secure=False,
        samesite="Lax",
        max_age=60 * 60 * 24 * 365 * 10  
    )

    return res



@router.get("/profile/{email}", response_model=UserProfile)
def get_profile(email: str):
    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cur = conn.cursor()
        cur.execute("SELECT name, email, favourite_insights, favourite_books FROM \"user\" WHERE email = %s", (email,))
        user = cur.fetchone()
        cur.close()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "name": user[0],
            "email": user[1],
            "favourite_insights": user[2],
            "favourite_books": user[3],
        }
    finally:
        conn.close()

@router.get("/favourite/insights/ids/{user_id}")
def get_all_fav_insight_ids(user_id: int):
    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT favourite_insights
            FROM "user"
            WHERE id = %s
        """, (user_id,))
        row = cur.fetchone()
        cur.close()

        if not row or not row[0]:
            return {"favourite_ids": []}

        favourite_insights = row[0]  # dict of categories with insights and descriptions

        all_ids = []
        for value in favourite_insights.values():
            ids = value.get("insights", [])
            all_ids.extend(ids)

        return {"favourite_ids": all_ids}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()



@router.post("/favourite/insight/add")
def add_fav_insight(
    user_id: int = Body(...),
    insight: dict = Body(...)
):
    """
    insight should be { "category": "XYZ", "id": 123, "description": "..." }
    """
    conn = connect_db()
    if not conn:
        raise HTTPException(500, "DB connection failed")
    cur = conn.cursor()

    try:
        cur.execute('SELECT favourite_insights FROM "user" WHERE id=%s;', (user_id,))
        row = cur.fetchone()
        favs = row[0] if row and row[0] is not None else {}
        
        cat = insight["category"]
        step_id = insight["id"]
        desc = insight["description"]
        icon = insight["icon"]

        # If category not present, create with description and empty insights list
        if cat not in favs:
            favs[cat] = {"description": desc, "insights": [],"icon": icon}
        # update description (in case it changes)
        favs[cat]["description"] = desc
        arr = favs[cat]["insights"]

        # Add or remove insight
        if step_id not in arr:
            arr.append(step_id)
        else:
            arr.remove(step_id)

        # Remove category if insights list is empty
        if not arr:
            del favs[cat]
        else:
            favs[cat]["insights"] = arr

        cur.execute(
            'UPDATE "user" SET favourite_insights = %s WHERE id=%s;',
            (json.dumps(favs), user_id)
        )
        conn.commit()
        return {"message": "Insight updated in favourites"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(400, str(e))
    finally:
        cur.close()
        conn.close()


@router.get("/favourite/insight/categories/{user_id}")
def get_fav_categories(user_id: int):
    print("user_id", user_id)
    conn = connect_db()
    if not conn:
        raise HTTPException(500, "DB connection failed")
    cur = conn.cursor()

    try:
        cur.execute('SELECT favourite_insights FROM "user" WHERE id=%s;', (user_id,))
        row = cur.fetchone()
        favs = row[0] if row and row[0] is not None else {}

        # Transform into list of objects
        categories = [
            {"name": cat, "description": favs[cat].get("description", "")}
            for cat in favs
        ]

        return {"categories": categories}

    except Exception as e:
        raise HTTPException(400, str(e))

    finally:
        cur.close()
        conn.close()


@router.post("/favourite/insight/list/{user_id}")
def get_fav_insights(
    user_id: int ,
    category: List[str] = Body(...) ,
):
    print("user_id lol", user_id)
    conn = connect_db()
    if not conn:
        raise HTTPException(500, "DB connection failed")
    cur = conn.cursor()

    try:
        cur.execute('SELECT favourite_insights FROM "user" WHERE id=%s;', (user_id,))
        row = cur.fetchone()
        favs = row[0] if row and row[0] is not None else {}

        result = []

        categories = category if category else favs.keys()

        for cat in categories:
            cat_obj = favs.get(cat)
            if not cat_obj or "insights" not in cat_obj:
                continue

            ids = cat_obj["insights"]
            if not ids:
                continue

            placeholders = ','.join(['%s'] * len(ids))
            query = f'SELECT * FROM "insights" WHERE id IN ({placeholders});'
            cur.execute(query, tuple(ids))
            rows = cur.fetchall()
            for row in rows:
                print(row)
                item = dict(zip([desc[0] for desc in cur.description], row))
                item["category"] = cat
                item["description"] = cat_obj.get("description", "")
                item['icon'] = cat_obj.get("icon", "")
                result.append(item)

        return {"insights": result}

    except Exception as e:
        print(e)
        raise HTTPException(400, str(e))

    finally:
        cur.close()
        conn.close()


@router.post("/complete/insight/{user_id}")
def toggle_completed_insight(
    user_id: int,
    book_name: str = Body(...),
    insight_id: str = Body(...)
):
    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="DB connection failed")
    
    cur = conn.cursor()
    try:
        cur.execute('SELECT completed_insights FROM "user" WHERE id = %s;', (user_id,))
        row = cur.fetchone()
        completed = row[0] if row and row[0] is not None else {}

        if book_name not in completed:
            completed[book_name] = []

        if insight_id in completed[book_name]:
            completed[book_name].remove(insight_id)
            action = "removed"
        else:
            completed[book_name].append(insight_id)
            action = "added"

        cur.execute(
            'UPDATE "user" SET completed_insights = %s WHERE id = %s;',
            (Json(completed), user_id)
        )
        conn.commit()

        return {"message": f"Insight {action} from completed list"}

    except Exception as e:
        print("Error:", e)
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        cur.close()
        conn.close()

@router.get("/completed/insights/{user_id}/{book_name}")
def get_completed_insights(user_id: int, book_name: str):
    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="DB connection failed")
    
    cur = conn.cursor()
    try:
        cur.execute('SELECT completed_insights FROM "user" WHERE id = %s;', (user_id,))
        row = cur.fetchone()
        completed = row[0] if row and row[0] is not None else {}

        insights = completed.get(book_name, [])

        return {"insights": insights}

    except Exception as e:
        print("Error:", e)
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        cur.close()
        conn.close()

@router.post("/favourite/book/{user_id}/{book_id}")
def toggle_favourite_book(user_id: int, book_id: int ):
    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="DB connection failed")

    cur = conn.cursor()
    try:
        cur.execute('SELECT favourite_books FROM "user" WHERE id = %s;', (user_id,))
        row = cur.fetchone()
        books = row[0] if row and row[0] is not None else []

        if book_id in books:
            books.remove(book_id)
        else:
            books.append(book_id)

        cur.execute(
            'UPDATE "user" SET favourite_books = %s WHERE id = %s;',
            (books, user_id)
        )
        conn.commit()
        return {"message": "Favourite books updated","favourite_books": books}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.get("/favourite/book/{user_id}")
def get_favourite_books(user_id: int):
    conn = connect_db()
    if not conn:
        raise HTTPException(500, "DB connection failed")
    cur = conn.cursor()

    try:
        cur.execute('SELECT favourite_books FROM "user" WHERE id = %s;', (user_id,))
        row = cur.fetchone()
        return {"favourite_books": row[0] if row and row[0] else []}

    except Exception as e:
        raise HTTPException(400, detail=str(e))

    finally:
        cur.close()
        conn.close()