import json
import time
from typing import Dict, Any
from fastapi import HTTPException
from sqlmodel import Session, select
from core.database import engine
from core.models import User, Book, Insight
from services.vector import recommend_for_user, recommend_next_insights
from core.redis import redis_client, CACHE_TTL
import sentry_sdk 
from core.analytics import posthog

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

def toggle_bookmark_book(user_id: str, book_id: int) -> Dict[str, Any]:
    try:
        with Session(engine) as session:
            user = session.get(User, user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            books = list(user.favourite_books or [])
            
            if book_id in books:
                books.remove(book_id)
                action = False
            else:
                books.append(book_id)
                action = True

            user.favourite_books = books
            session.add(user)
            session.commit()

        redis_client.delete(f"bookmarks:books_data:{user_id}")
        
        event_name = 'book_bookmarked' if action else 'book_unbookmarked'
        posthog.capture(
            distinct_id=user_id, 
            event=event_name, 
            properties={'book_id': book_id, 'total_bookmarked_books': len(books)}
        )

        return {"bookmarked": action, "favourite_books": books}
    except Exception as e:
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=500, detail="Failed to toggle book bookmark")


def toggle_bookmark_insight(user_id: str, insight_id: int) -> Dict[str, Any]:
    try:
        with Session(engine) as session:
            user = session.get(User, user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            insights = list(user.favourite_insights or [])
            
            if insight_id in insights:
                insights.remove(insight_id)
                action = False
            else:
                insights.append(insight_id)
                action = True

            user.favourite_insights = insights
            session.add(user)
            session.commit()

        redis_client.delete(f"bookmarks:insights_data:{user_id}")
        redis_client.delete(f"recommend:{user_id}")
        for key in redis_client.scan_iter(f"session_recommend:{user_id}:*"):
            redis_client.delete(key)

        event_name = 'insight_bookmarked' if action else 'insight_unbookmarked'
        posthog.capture(
            distinct_id=user_id, 
            event=event_name, 
            properties={'insight_id': insight_id, 'total_bookmarked_insights': len(insights)}
        )

        return {"bookmarked": action, "favourite_insights": insights}
    except Exception as e:
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=500, detail="Failed to toggle insight bookmark")


def recommend(user_id: str):
    start_time = time.time()
    cache_key = f"recommend:{user_id}"
    cached_data = redis_client.get(cache_key)
    
    if cached_data:
        data = json.loads(cached_data)
        latency = time.time() - start_time
        posthog.capture(distinct_id=user_id, event='recommendations_fetched', properties={'source': 'redis_cache', 'latency_seconds': round(latency, 2)})
        return data

    try:
        with Session(engine) as session:
            user = session.get(User, user_id)
            insight_ids = user.favourite_insights if user else []
        
        recommendations = recommend_for_user(insight_ids)
        
        result = {"recommendations": recommendations}
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
        
        latency = time.time() - start_time
        posthog.capture(distinct_id=user_id, event='recommendations_fetched', properties={'source': 'vector_db', 'latency_seconds': round(latency, 2)})
        
        return result
    except Exception as e:
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")


def session_recommend(user_id: str, insight_id: int):
    cache_key = f"session_recommend:{user_id}:{insight_id}"
    cached_data = redis_client.get(cache_key)
    
    if cached_data:
        data = json.loads(cached_data)
        posthog.capture(distinct_id=user_id, event='session_recommendations_fetched', properties={'source': 'redis_cache'})
        return data

    try:
        with Session(engine) as session:
            insight_obj = session.get(Insight, insight_id)
            if not insight_obj:
                raise HTTPException(status_code=404, detail="Insight not found")
                
            user = session.get(User, user_id)
            bookmarked_ids = user.favourite_insights if user else []

        # 🌟 Clean, direct return
        recommendations = recommend_next_insights(
            current_insight_title=insight_obj.title,
            current_insight_description=insight_obj.description,
            user_bookmarked_ids=bookmarked_ids,
            current_insight_id=insight_id,
            top_k=3
        )

        result = {"recommendations": recommendations}
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
        
        posthog.capture(distinct_id=user_id, event='session_recommendations_fetched', properties={'source': 'vector_db'})
        return result
    except Exception as e:
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=500, detail="Failed to fetch session recommendations")


def get_bookmarked_books_with_categories(user_id: str) -> Dict[str, Any]:
    cache_key = f"bookmarks:books_data:{user_id}"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        data = json.loads(cached_data)
        return data

    try:
        with Session(engine) as session:
            user = session.get(User, user_id)
            book_ids = user.favourite_books if user else []

            if not book_ids:
                result = {"bookmarked_books": [], "favourite_categories": []}
                redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
                return result

            statement = select(Book).where(Book.id.in_(book_ids))
            books_data = session.exec(statement).all()

        try:
            with open('categories.json', 'r', encoding='utf-8') as file:
                categories_data = json.load(file)
        except FileNotFoundError:
            categories_data = {}

        result_books = []
        unique_categories = set()

        for book in books_data:
            result_books.append({
                "id": book.id, 
                "title": book.title, 
                "author": book.author, 
                "thumbnail": book.thumbnail, 
                "description": book.description, 
                "category": book.category 
            })
            for cat_name in book.category:
                if cat_name:
                    unique_categories.add(cat_name)

        result_categories = []
        for cat_name in unique_categories:
            details = get_category_details_from_json(cat_name, categories_data)
            result_categories.append(details)

        result = {
            "books": result_books,
            "categories": result_categories
        }

        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
        posthog.capture(distinct_id=user_id, event='viewed_bookmarked_books', properties={'source': 'database', 'count': len(result_books)})
        return result
        
    except Exception as e:
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=500, detail=str(e))


def get_bookmarked_insights_with_categories(user_id: str) -> Dict[str, Any]:
    cache_key = f"bookmarks:insights_data:{user_id}"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        data = json.loads(cached_data)
        return data

    try:
        with Session(engine) as session:
            user = session.get(User, user_id)
            insight_ids = user.favourite_insights if user else []

            if not insight_ids:
                result = {"bookmarked_insights": [], "favourite_categories": []}
                redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
                return result

            statement = select(Insight).where(Insight.id.in_(insight_ids))
            insights_data = session.exec(statement).all()

        result_insights = []
        unique_categories = set()
        
        for insight in insights_data:
            result_insights.append({
                "step_id": insight.id, 
                "book_name": insight.book_name, 
                "category": insight.category_name, 
                "icon": insight.category_icon, 
                "title": insight.title, 
                "description": insight.description, 
                "detailed_breakdown": insight.detailed_breakdown
            })
            if insight.category_name:
                unique_categories.add((insight.category_name, insight.category_icon))

        result_categories = [
            {"name": name, "icon": icon, "description": f"Explore insights from {name}."}
            for name, icon in unique_categories
        ]

        result = {
            "insights": result_insights,
            "categories": result_categories
        }

        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
        posthog.capture(distinct_id=user_id, event='viewed_bookmarked_insights', properties={'source': 'database'})
        return result
        
    except Exception as e:
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=500, detail=str(e))