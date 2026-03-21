import os
import json
import time
from typing import Dict, Any, List
from fastapi import HTTPException
from psycopg2.extras import Json
from core.database import connect_db
from services.vector import recommend_for_user, recommend_next_insights
from core.redis import redis_client, CACHE_TTL
import sentry_sdk 
from core.analytics import posthog

# --- Helper Functions ---

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

def attach_icons_to_recommendations(recommendations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Injects UI icons into raw database/vector recommendations."""
    try:
        with open('categories.json', 'r', encoding='utf-8') as file:
            categories_data = json.load(file)
    except FileNotFoundError:
        categories_data = {}
        
    for rec in recommendations:
        cat_name = rec.get("category")
        if cat_name:
            details = get_category_details_from_json(cat_name, categories_data)
            rec["category_icon"] = details.get("icon", "📌")
        else:
            rec["category_icon"] = "📌"
            
    return recommendations


# --- Business Logic ---

def get_me_logic(user_id: str) -> Dict[str, Any]:
    try:
        conn = connect_db()
        cur = conn.cursor()
        cur.execute('SELECT id, name, email, favourite_books, favourite_insights FROM "user" WHERE id=%s', (user_id,))
        user = cur.fetchone()
        conn.close()

        if not user:
            posthog.capture(
                distinct_id=user_id, 
                event='user_profile_fetch_failed', 
                properties={'reason': 'not_found'}
            )
            raise HTTPException(status_code=401, detail="User not found")

        # 🌟 Track profile views to monitor active user sessions
        posthog.capture(
            distinct_id=user_id, 
            event='user_profile_viewed', 
            properties={
                'bookmarked_books_count': len(user[3] or []),
                'bookmarked_insights_count': len(user[4] or [])
            }
        )

        return {
            "user_id": user[0], 
            "name": user[1], 
            "email": user[2],
            "favourite_books": user[3] or [], 
            "favourite_insights": user[4] or []
        }
    except Exception as e:
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=500, detail="Database error fetching profile")


def toggle_bookmark_book_logic(user_id: str, book_id: int) -> Dict[str, Any]:
    try:
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
        
        # 🌟 Track what users are actually saving
        event_name = 'book_bookmarked' if action else 'book_unbookmarked'
        posthog.capture(
            distinct_id=user_id, 
            event=event_name, 
            properties={
                'book_id': book_id,
                'total_bookmarked_books': len(books)
            }
        )

        return {"bookmarked": action, "favourite_books": books}
    except Exception as e:
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=500, detail="Failed to toggle book bookmark")


def toggle_bookmark_insight_logic(user_id: str, insight_id: int) -> Dict[str, Any]:
    try:
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

        # 🌟 Track insight saves
        event_name = 'insight_bookmarked' if action else 'insight_unbookmarked'
        posthog.capture(
            distinct_id=user_id, 
            event=event_name, 
            properties={
                'insight_id': insight_id,
                'total_bookmarked_insights': len(insights)
            }
        )

        return {"bookmarked": action, "favourite_insights": insights}
    except Exception as e:
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=500, detail="Failed to toggle insight bookmark")


def recommend_logic(user_id: str):
    start_time = time.time()
    cache_key = f"recommend:{user_id}"
    cached_data = redis_client.get(cache_key)
    
    if cached_data:
        data = json.loads(cached_data)
        latency = time.time() - start_time
        posthog.capture(
            distinct_id=user_id, 
            event='recommendations_fetched', 
            properties={
                'source': 'redis_cache',
                'latency_seconds': round(latency, 2),
                'recommendations_count': len(data.get('recommendations', []))
            }
        )
        return data

    try:
        conn = connect_db()
        cur = conn.cursor()
        cur.execute('SELECT favourite_insights FROM "user" WHERE id=%s', (user_id,))
        row = cur.fetchone()
        conn.close()

        insight_ids = row[0] or []
        
        # 🌟 Fetch raw recommendations and attach UI icons
        raw_recommendations = recommend_for_user(insight_ids)
        recommendations = attach_icons_to_recommendations(raw_recommendations)
        
        result = {"recommendations": recommendations}

        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
        
        latency = time.time() - start_time
        posthog.capture(
            distinct_id=user_id, 
            event='recommendations_fetched', 
            properties={
                'source': 'vector_db',
                'latency_seconds': round(latency, 2),
                'recommendations_count': len(recommendations),
                'user_bookmark_count': len(insight_ids)
            }
        )
        
        return result
    except Exception as e:
        sentry_sdk.capture_exception(e)
        posthog.capture(
            distinct_id=user_id, 
            event='recommendations_failed', 
            properties={'error': str(e)}
        )
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")


def session_recommend_logic(user_id: str, insight_id: int):
    start_time = time.time()
    cache_key = f"session_recommend:{user_id}:{insight_id}"
    cached_data = redis_client.get(cache_key)
    
    if cached_data:
        data = json.loads(cached_data)
        latency = time.time() - start_time
        posthog.capture(
            distinct_id=user_id, 
            event='session_recommendations_fetched', 
            properties={
                'source': 'redis_cache',
                'current_insight_id': insight_id,
                'latency_seconds': round(latency, 2)
            }
        )
        return data

    try:
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
        
        # 🌟 Fetch raw recommendations and attach UI icons
        raw_recommendations = recommend_next_insights(
            current_insight_title=title,
            current_insight_description=description,
            user_bookmarked_ids=bookmarked_ids,
            current_insight_id=insight_id,
            top_k=3
        )
        recommendations = attach_icons_to_recommendations(raw_recommendations)

        result = {"recommendations": recommendations}
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
        
        latency = time.time() - start_time
        posthog.capture(
            distinct_id=user_id, 
            event='session_recommendations_fetched', 
            properties={
                'source': 'vector_db',
                'current_insight_id': insight_id,
                'latency_seconds': round(latency, 2)
            }
        )
        
        return result
    except Exception as e:
        sentry_sdk.capture_exception(e)
        posthog.capture(
            distinct_id=user_id, 
            event='session_recommendations_failed', 
            properties={'error': str(e), 'insight_id': insight_id}
        )
        raise HTTPException(status_code=500, detail="Failed to fetch session recommendations")


def get_bookmarked_books_with_categories_logic(user_id: str) -> Dict[str, Any]:
    cache_key = f"bookmarks:books_data:{user_id}"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        data = json.loads(cached_data)
        posthog.capture(
            distinct_id=user_id, 
            event='viewed_bookmarked_books', 
            properties={'source': 'redis_cache', 'count': len(data.get('books', []))}
        )
        return data

    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    try:
        cur = conn.cursor()
        cur.execute('SELECT favourite_books FROM "user" WHERE id=%s', (user_id,))
        row = cur.fetchone()
        book_ids = row[0] if row and row[0] else []

        if not book_ids:
            result = {"bookmarked_books": [], "favourite_categories": []}
            redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
            posthog.capture(
                distinct_id=user_id, 
                event='viewed_bookmarked_books', 
                properties={'source': 'database', 'count': 0}
            )
            return result

        cur.execute('''
            SELECT id, title, author, thumbnail, description, category::text[] 
            FROM book 
            WHERE id = ANY(%s)
        ''', (book_ids,))
        books_data = cur.fetchall()

        try:
            with open('categories.json', 'r', encoding='utf-8') as file:
                categories_data = json.load(file)
        except FileNotFoundError:
            categories_data = {}

        result_books = []
        unique_categories = set()

        for id_, title, author, thumbnail, description, category_list in books_data:
            safe_categories = category_list if isinstance(category_list, list) else []
            result_books.append({
                "id": id_, 
                "title": title, 
                "author": author, 
                "thumbnail": thumbnail, 
                "description": description, 
                "category": safe_categories 
            })
            for cat_name in safe_categories:
                if cat_name:
                    unique_categories.add(cat_name)

        result_categories = []
        for cat_name in unique_categories:
            cat_details = categories_data.get(cat_name, {})
            result_categories.append({
                "name": cat_name,
                "icon": cat_details.get("icon", "📚"),
                "description": cat_details.get("description", "Explore books in this category.")
            })

        result = {
            "books": result_books,
            "categories": result_categories
        }

        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
        posthog.capture(
            distinct_id=user_id, 
            event='viewed_bookmarked_books', 
            properties={'source': 'database', 'count': len(result_books)}
        )
        return result
        
    except Exception as e:
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


def get_bookmarked_insights_with_categories_logic(user_id: str) -> Dict[str, Any]:
    cache_key = f"bookmarks:insights_data:{user_id}"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        data = json.loads(cached_data)
        posthog.capture(
            distinct_id=user_id, 
            event='viewed_bookmarked_insights', 
            properties={'source': 'redis_cache', 'count': len(data.get('insights', []))}
        )
        return data

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
            posthog.capture(
                distinct_id=user_id, 
                event='viewed_bookmarked_insights', 
                properties={'source': 'database', 'count': 0}
            )
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
        posthog.capture(
            distinct_id=user_id, 
            event='viewed_bookmarked_insights', 
            properties={'source': 'database', 'count': len(result_insights)}
        )
        return result
        
    except Exception as e:
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()