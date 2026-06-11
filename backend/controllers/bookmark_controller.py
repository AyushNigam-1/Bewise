import json
from typing import Any, Dict
from fastapi import HTTPException
from core.telemetry import NodeTracker
from core.redis import CACHE_TTL, redis_client
from repositories.bookmark_repository import BookmarkRepository


def get_category_details_from_json(
    category_name: str, categories_data: dict
) -> Dict[str, str]:
    """Helper utility for formatting category details."""
    for main_cat, main_data in categories_data.items():
        subcategories = main_data.get("subcategories", {})
        if category_name in subcategories:
            return {
                "name": category_name,
                "icon": subcategories[category_name].get("icon", ""),
                "description": subcategories[category_name].get("description", ""),
            }

        if category_name == main_cat:
            return {
                "name": category_name,
                "icon": main_data.get("icon", ""),
                "description": main_data.get("description", ""),
            }

    return {
        "name": category_name,
        "icon": "📌",
        "description": "Explore insights from this category.",
    }


def toggle_bookmark_book(user_id: str, book_id: int) -> Dict[str, Any]:
    with NodeTracker("toggle_book_bookmark", session_id=user_id) as tracker:
        tracker.add_data(book_id=book_id)
        
        try:
            # 1. Ask Repo to handle the database transaction
            result = BookmarkRepository.toggle_book(user_id, book_id)
            if result is None:
                raise HTTPException(status_code=404, detail="User not found")

            action, books = result

            # 2. Dynamically update the event name based on the DB result
            tracker.event_name = "book_bookmarked" if action else "book_unbookmarked"
            tracker.add_data(total_bookmarked_books=len(books))

            # 3. Clear cache
            redis_client.delete(f"bookmarks:books_data:{user_id}")

            return {"bookmarked": action, "favourite_books": books}

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail="Failed to toggle book bookmark") from e


def toggle_bookmark_insight(user_id: str, insight_id: int) -> Dict[str, Any]:
    with NodeTracker("toggle_insight_bookmark", session_id=user_id) as tracker:
        tracker.add_data(insight_id=insight_id)
        
        try:
            result = BookmarkRepository.toggle_insight(user_id, insight_id)
            if result is None:
                raise HTTPException(status_code=404, detail="User not found")

            action, insights = result

            # Dynamically update the event name
            tracker.event_name = "insight_bookmarked" if action else "insight_unbookmarked"
            tracker.add_data(total_bookmarked_insights=len(insights))

            redis_client.delete(f"bookmarks:insights_data:{user_id}")
            redis_client.delete(f"recommend:{user_id}")
            for key in redis_client.scan_iter(f"session_recommend:{user_id}:*"):
                redis_client.delete(key)

            return {"bookmarked": action, "favourite_insights": insights}

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail="Failed to toggle insight bookmark") from e


def get_bookmarked_books_with_categories(user_id: str) -> Dict[str, Any]:
    cache_key = f"bookmarks:books_data:{user_id}"
    
    with NodeTracker("viewed_bookmarked_books", session_id=user_id) as tracker:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            tracker.add_data(source="redis_cache")
            return json.loads(cached_data)

        try:
            # Ask Repo for the DB models
            books_data = BookmarkRepository.get_bookmarked_books(user_id)

            # User not found or empty array
            if not books_data:
                result = {"bookmarked_books": [], "favourite_categories": []}
                redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
                tracker.add_data(source="database", count=0)
                return result

            try:
                with open("categories.json", "r", encoding="utf-8") as file:
                    categories_data = json.load(file)
            except FileNotFoundError:
                categories_data = {}

            result_books = []
            unique_categories = set()

            for book in books_data:
                result_books.append(
                    {
                        "id": book.id,
                        "title": book.title,
                        "author": book.author,
                        "thumbnail": book.thumbnail,
                        "description": book.description,
                        "category": book.category,
                    }
                )
                for cat_name in book.category:
                    if cat_name:
                        unique_categories.add(cat_name)

            result_categories = [
                get_category_details_from_json(cat_name, categories_data)
                for cat_name in unique_categories
            ]

            result = {"books": result_books, "categories": result_categories}

            redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
            tracker.add_data(source="database", count=len(result_books))
            return result

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e


def get_bookmarked_insights_with_categories(user_id: str) -> Dict[str, Any]:
    cache_key = f"bookmarks:insights_data:{user_id}"
    
    with NodeTracker("viewed_bookmarked_insights", session_id=user_id) as tracker:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            tracker.add_data(source="redis_cache")
            return json.loads(cached_data)

        try:
            # Ask Repo for the DB models
            insights_data = BookmarkRepository.get_bookmarked_insights(user_id)

            # User not found or empty array
            if not insights_data:
                result = {"bookmarked_insights": [], "favourite_categories": []}
                redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
                tracker.add_data(source="database", count=0)
                return result

            result_insights = []
            unique_categories = set()

            for insight in insights_data:
                result_insights.append(
                    {
                        "step_id": insight.id,
                        "book_name": insight.book_name,
                        "category": insight.category_name,
                        "icon": insight.category_icon,
                        "title": insight.title,
                        "description": insight.description,
                        "detailed_breakdown": insight.detailed_breakdown,
                    }
                )
                if insight.category_name:
                    unique_categories.add((insight.category_name, insight.category_icon))

            result_categories = [
                {
                    "name": name,
                    "icon": icon,
                    "description": f"Explore insights from {name}.",
                }
                for name, icon in unique_categories
            ]

            result = {"insights": result_insights, "categories": result_categories}

            redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
            tracker.add_data(source="database", count=len(result_insights))
            return result

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e