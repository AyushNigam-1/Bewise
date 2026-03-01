import os
import json
import secrets
import bcrypt
from jose import jwt
from datetime import datetime, timedelta
from typing import List, Dict, Any
from fastapi import HTTPException
from psycopg2.extras import Json
from core.database import connect_db
from services.vector import recommend_for_user, recommend_next_insights
from core.redis import redis_client, CACHE_TTL

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE = timedelta(minutes=15)
REFRESH_TOKEN_EXPIRE = timedelta(days=30)

# --- Helper Functions ---
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

# --- Business Logic ---
def get_me_logic(access_token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload["sub"]
    except:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    conn = connect_db()
    cur = conn.cursor()
    cur.execute('SELECT id, name, email, favourite_books, favourite_insights FROM "user" WHERE email=%s', (email,))
    user = cur.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {
        "user_id": user[0], "name": user[1], "email": user[2],
        "favourite_books": user[3], "favourite_insights": user[4]
    }

def register_user_logic(name: str, email: str, password: str) -> Dict[str, int]:
    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    try:
        cur = conn.cursor()
        cur.execute(
            'INSERT INTO "user"(name,email,password) VALUES(%s,%s,%s) RETURNING id',
            (name, email, hashed)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        return {"user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

def login_user_logic(email: str, password: str) -> Dict[str, Any]:
    conn = connect_db()
    cur = conn.cursor()
    db_user = get_user_by_email(conn, email)

    if not db_user or not bcrypt.checkpw(password.encode(), db_user[3].encode()):
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id = db_user[0]
    cur.execute("DELETE FROM user_sessions WHERE user_id=%s", (user_id,))

    access = create_token({"sub": email}, ACCESS_TOKEN_EXPIRE)
    refresh = secrets.token_urlsafe(64)

    cur.execute("""
        INSERT INTO user_sessions(user_id, refresh_token, expires_at)
        VALUES(%s,%s,%s)
    """, (user_id, refresh, datetime.utcnow() + REFRESH_TOKEN_EXPIRE))

    conn.commit()
    conn.close()

    return {"user_id": user_id, "access_token": access, "refresh_token": refresh}

def refresh_token_logic(refresh_token: str) -> str:
    conn = connect_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT u.email FROM user_sessions s
        JOIN "user" u ON s.user_id = u.id
        WHERE s.refresh_token=%s AND s.expires_at > NOW()
    """, (refresh_token,))
    row = cur.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=401, detail="Session expired")

    return create_token({"sub": row[0]}, ACCESS_TOKEN_EXPIRE)

def logout_logic(refresh_token: str):
    conn = connect_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM user_sessions WHERE refresh_token=%s", (refresh_token,))
    conn.commit()
    conn.close()

def request_reset_logic(email: str):
    conn = connect_db()
    cur = conn.cursor()
    cur.execute('SELECT id FROM "user" WHERE email=%s', (email,))
    user = cur.fetchone()

    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

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

def reset_password_logic(token: str, new_password: str):
    conn = connect_db()
    cur = conn.cursor()
    cur.execute('SELECT id FROM "user" WHERE reset_token=%s AND reset_expiry > NOW()', (token,))
    user = cur.fetchone()

    if not user:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user_id = user[0]
    hashed = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()

    cur.execute(
        '''UPDATE "user" SET password=%s, reset_token=NULL, reset_expiry=NULL WHERE id=%s''',
        (hashed, user_id)
    )
    cur.execute("DELETE FROM user_sessions WHERE user_id=%s", (user_id,))
    
    conn.commit()
    conn.close()
    return {"message": "Password updated"}

def toggle_bookmark_book_logic(user_id: int, book_id: int) -> Dict[str, Any]:
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

    cur.execute('UPDATE "user" SET favourite_books=%s WHERE id=%s', (books, user_id))
    conn.commit()
    conn.close()

    redis_client.delete(f"bookmarks:books_data:{user_id}")
    return {"bookmarked": action, "favourite_books": books}

def toggle_bookmark_insight_logic(user_id: int, insight_id: int) -> Dict[str, Any]:
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

    cur.execute('UPDATE "user" SET favourite_insights=%s WHERE id=%s', (Json(insights), user_id))
    conn.commit()
    conn.close()

    redis_client.delete(f"bookmarks:insights_data:{user_id}")
    
    redis_client.delete(f"recommend:{user_id}")
    for key in redis_client.scan_iter(f"session_recommend:{user_id}:*"):
        redis_client.delete(key)

    return {"bookmarked": action, "favourite_insights": insights}

def recommend_logic(user_id: int):
    cache_key = f"recommend:{user_id}"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    conn = connect_db()
    cur = conn.cursor()
    cur.execute('SELECT favourite_insights FROM "user" WHERE id=%s', (user_id,))
    row = cur.fetchone()
    conn.close()

    insight_ids = row[0] or []
    recommendations = recommend_for_user(insight_ids)
    result = {"recommendations": recommendations}

    redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
    return result

def session_recommend_logic(user_id: int, insight_id: int):
    cache_key = f"session_recommend:{user_id}:{insight_id}"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    conn = connect_db()
    cur = conn.cursor()
    cur.execute("SELECT title, description FROM insights WHERE id=%s", (insight_id,))
    insight_row = cur.fetchone()

    if not insight_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Insight not found")

    title, description = insight_row
    cur.execute('SELECT favourite_insights FROM "user" WHERE id=%s', (user_id,))
    user_row = cur.fetchone()
    conn.close()

    bookmarked_ids = user_row[0] if user_row and user_row[0] else []
    recommendations = recommend_next_insights(
        current_insight_title=title,
        current_insight_description=description,
        user_bookmarked_ids=bookmarked_ids,
        current_insight_id=insight_id,
        top_k=3
    )

    result = {"recommendations": recommendations}
    redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
    return result

def get_bookmarked_books_with_categories_logic(user_id: int) -> Dict[str, Any]:
    # Update cache key to reflect the combined payload
    cache_key = f"bookmarks:books_data:{user_id}"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    try:
        cur = conn.cursor()
        
        # Step 1: Fetch user's favourite book IDs
        cur.execute('SELECT favourite_books FROM "user" WHERE id=%s', (user_id,))
        row = cur.fetchone()
        book_ids = row[0] if row and row[0] else []

        # If no bookmarks, return empty arrays immediately
        if not book_ids:
            result = {"bookmarked_books": [], "favourite_categories": []}
            redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
            return result

        # Step 2: Fetch book details and cast category to a text array
        cur.execute('''
            SELECT id, title, author, thumbnail, description, category::text[] 
            FROM book 
            WHERE id = ANY(%s)
        ''', (book_ids,))
        books_data = cur.fetchall()

        # Step 3: Load the local JSON file
        try:
            with open('categories.json', 'r', encoding='utf-8') as file:
                categories_data = json.load(file)
        except FileNotFoundError:
            categories_data = {}

        # Step 4: Process books and extract unique main categories
        result_books = []
        unique_categories = set()

        for id_, title, author, thumbnail, description, category_list in books_data:
            # category_list is now a clean Python list thanks to ::text[] in SQL
            safe_categories = category_list if isinstance(category_list, list) else []
            
            result_books.append({
                "id": id_, 
                "title": title, 
                "author": author, 
                "thumbnail": thumbnail, 
                "description": description, 
                "category": safe_categories # Keep as array for the frontend
            })
            
            # Add to our unique set for JSON lookup
            for cat_name in safe_categories:
                if cat_name:
                    unique_categories.add(cat_name)

        # Step 5: Map JSON details to the unique categories
        result_categories = []
        for cat_name in unique_categories:
            # Since books use Main Categories, we look them up at the root of the JSON
            cat_details = categories_data.get(cat_name, {})
            
            result_categories.append({
                "name": cat_name,
                "icon": cat_details.get("icon", "📚"), # Fallback icon
                "description": cat_details.get("description", "Explore books in this category.") # Fallback description
            })

        result = {
            "books": result_books,
            "categories": result_categories
        }

        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

def get_category_details_from_json(category_name: str, categories_data: dict) -> Dict[str, str]:
    for main_cat, main_data in categories_data.items():
        subcategories = main_data.get("subcategories", {})
        if category_name in subcategories:
            return {
                "name": category_name,
                "icon": subcategories[category_name].get("icon", ""),
                "description": subcategories[category_name].get("description", "")
            }
        
        if category_name == main_cat:
            return {
                "name": category_name,
                "icon": main_data.get("icon", ""),
                "description": main_data.get("description", "")
            }
            
    return {
        "name": category_name,
        "icon": "📌",
        "description": "Explore insights from this category."
    }

def get_bookmarked_insights_with_categories_logic(user_id: int) -> Dict[str, Any]:
    cache_key = f"bookmarks:insights_data:{user_id}"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    try:
        cur = conn.cursor()
        
        cur.execute('SELECT favourite_insights FROM "user" WHERE id=%s', (user_id,))
        row = cur.fetchone()
        insight_ids = row[0] if row and row[0] else []

        if not insight_ids:
            result = {"bookmarked_insights": [], "favourite_categories": []}
            redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
            return result

        cur.execute('''
            SELECT id, book_name, category_name, title, description, detailed_breakdown 
            FROM insights 
            WHERE id = ANY(%s)
        ''', (insight_ids,))
        insights_data = cur.fetchall()

        try:
            with open('categories.json', 'r', encoding='utf-8') as file:
                categories_data = json.load(file)
        except FileNotFoundError:
            categories_data = {}

        result_insights = []
        unique_categories = set()
        
        for id_, book_name, category_name, title, description, detailed_breakdown in insights_data:
            result_insights.append({
                "step_id": id_, 
                "book_name": book_name, 
                "category": category_name, 
                "title": title, 
                "description": description, 
                "detailed_breakdown": detailed_breakdown
            })
            if category_name:
                unique_categories.add(category_name)

        result_categories = []
        category_icon_map = {} 

        for cat_name in unique_categories:
            details = get_category_details_from_json(cat_name, categories_data)
            result_categories.append(details)
            category_icon_map[cat_name] = details["icon"]

        for insight in result_insights:
            insight["icon"] = category_icon_map.get(insight["category"], "📌")

        result = {
            "insights": result_insights,
            "categories": result_categories
        }

        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()