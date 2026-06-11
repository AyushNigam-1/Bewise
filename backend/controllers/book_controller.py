import json
from typing import Any, Dict, List
from fastapi import HTTPException
from core.telemetry import NodeTracker
from core.redis import CACHE_TTL, redis_client
from repositories.book_repository import BookRepository
from services.vector import embed_and_upsert_insight
from src.processor import BookistProcessor
from src.utils.file_operations import load_json_file


def get_all_books(user_id: str = "anonymous") -> List[Dict[str, Any]]:
    cache_key = "books:all"

    with NodeTracker("fetched_all_books", session_id=user_id) as tracker:
        cached_data = redis_client.get(cache_key)

        if cached_data:
            books = json.loads(cached_data)
            tracker.add_data(source="redis_cache", count=len(books))
            return books

        try:
            books_data = BookRepository.get_all_books()
            book_list = [
                {
                    "id": b.id,
                    "title": b.title,
                    "author": b.author,
                    "thumbnail": b.thumbnail,
                    "description": b.description,
                    "category": b.category,
                }
                for b in books_data
            ]

            redis_client.setex(cache_key, CACHE_TTL, json.dumps(book_list))
            tracker.add_data(source="database", count=len(book_list))
            return book_list

        except Exception as e:
            raise HTTPException(status_code=500, detail="Database connection failed") from e


def find_books_by_categories(
    categories: List[str], user_id: str = "anonymous"
) -> Dict[str, Any]:
    cache_key = (
        "books_with_cats:all"
        if not categories
        else f"books_with_cats:{','.join(sorted(categories))}"
    )

    with NodeTracker("searched_books_by_category", session_id=user_id) as tracker:
        tracker.add_data(categories=categories)
        cached_data = redis_client.get(cache_key)

        if cached_data:
            data = json.loads(cached_data)
            tracker.add_data(source="redis_cache", books_count=len(data.get("books", [])))
            return data

        try:
            books_data = BookRepository.get_books_by_categories(categories)

            books = [
                {
                    "id": b.id,
                    "title": b.title,
                    "author": b.author,
                    "thumbnail": b.thumbnail,
                    "description": b.description,
                    "category": b.category,
                    "content": b.content,
                }
                for b in books_data
            ]

            unique_category_names = {cat for b in books_data if b.category for cat in b.category}
            all_categories_metadata = load_json_file("", "categories.json", {})

            filtered_categories = sorted(
                [
                    {
                        "name": cat_name,
                        "icon": all_categories_metadata.get(cat_name, {}).get("icon", "📌"),
                        "description": all_categories_metadata.get(cat_name, {}).get(
                            "description", f"Explore insights from {cat_name}."
                        ),
                    }
                    for cat_name in unique_category_names
                ],
                key=lambda x: x["name"],
            )

            result = {"books": books, "categories": filtered_categories}

            redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
            tracker.add_data(
                source="database",
                books_count=len(books),
                cats_count=len(filtered_categories),
            )

            return result

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e


def get_book_info(title: str, user_id: str = "anonymous") -> Dict[str, Any]:
    cache_key = f"book:info:{title}"

    with NodeTracker("viewed_book_details", session_id=user_id) as tracker:
        tracker.add_data(book_title=title)
        cached_data = redis_client.get(cache_key)

        if cached_data:
            tracker.add_data(source="redis_cache")
            return json.loads(cached_data)

        try:
            book = BookRepository.get_book_by_title(title)

            if not book:
                tracker.add_data(not_found=True)
                raise HTTPException(status_code=404, detail="Book not found")

            categories_str = ", ".join(book.category) if book.category else ""
            num_keys = len(book.content or {})
            total_steps = sum(
                len((book.content or {}).get(key, {}).get("steps", []))
                for key in (book.content or {}).keys()
            )

            response_data = {
                "id": book.id,
                "title": book.title,
                "thumbnail": book.thumbnail,
                "author": book.author,
                "description": book.description,
                "sub_categories_count": num_keys,
                "total_insights": total_steps,
                "categories": categories_str,
            }

            redis_client.setex(cache_key, CACHE_TTL, json.dumps(response_data))
            tracker.add_data(source="database", total_insights=total_steps)
            return response_data

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail="Database error") from e


def get_book_content(
    title: str, category: List[str] = None, user_id: str = "anonymous"
) -> Dict[str, Any]:
    if category is None:
        category = []

    cache_key = f"book:content_combined:{title}:{'all' if not category else ','.join(sorted(category))}"

    with NodeTracker("viewed_book_content", session_id=user_id) as tracker:
        tracker.add_data(book_title=title, categories_requested=category)
        cached_data = redis_client.get(cache_key)

        if cached_data:
            data = json.loads(cached_data)
            tracker.add_data(source="redis_cache", values_count=len(data.get("values", [])))
            return data

        try:
            book = BookRepository.get_book_by_title(title)

            if not book:
                raise HTTPException(status_code=404, detail="Book not found")

            content = book.content or {}

            # 1. Process Keys
            keys_result = [
                {
                    "name": key,
                    "icon": value.get("icon", ""),
                    "description": value.get("description", ""),
                    "steps_count": str(len(value.get("steps", []))),
                }
                for key, value in content.items()
            ]

            # 2. Process Values
            values_result = []
            keys_to_use = category if category else list(content.keys())

            all_step_ids = []
            for key in keys_to_use:
                if key in content:
                    all_step_ids.extend(content[key].get("steps", []))

            if all_step_ids:
                steps_data = BookRepository.get_insights_by_ids(all_step_ids)

                for step in steps_data:
                    if step.category_name in keys_to_use:
                        values_result.append(
                            {
                                "icon": step.category_icon,
                                "category": step.category_name,
                                "step_id": step.id,
                                "step": step.title,
                                "description": step.description,
                            }
                        )

            result = {"keys": keys_result, "values": values_result}

            redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
            tracker.add_data(
                source="database",
                keys_count=len(keys_result),
                values_count=len(values_result),
            )

            return result

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e


def get_step_details(step_id: int, user_id: str = "anonymous") -> Dict[str, Any]:
    cache_key = f"insight:{step_id}"

    with NodeTracker("read_insight_step", session_id=user_id) as tracker:
        tracker.add_data(step_id=step_id)
        cached_data = redis_client.get(cache_key)

        if cached_data:
            data = json.loads(cached_data)
            tracker.add_data(source="redis_cache", book_title=data.get("book_name"))
            return data

        try:
            insight = BookRepository.get_insight_by_id(step_id)

            if not insight:
                raise HTTPException(status_code=404, detail="Step not found")

            result = {
                "step_id": insight.id,
                "book_name": insight.book_name,
                "category": insight.category_name,
                "title": insight.title,
                "description": insight.description,
                "detailed_breakdown": insight.detailed_breakdown,
                "category_icon": insight.category_icon,
            }

            redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
            tracker.add_data(source="database", book_title=insight.book_name)
            return result

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e


def create_book(book_data: Dict, user_id: str = "system") -> Dict[str, str]:
    with NodeTracker("book_created_and_embedded", session_id=user_id) as tracker:
        tracker.add_data(book_title=book_data.get("Title"))

        try:
            total_insights_embedded = BookRepository.create_book_transaction(
                book_data=book_data, embed_callback=embed_and_upsert_insight
            )

            # Invalidate all book caches so the new book appears immediately
            for key in redis_client.scan_iter("books:*"):
                redis_client.delete(key)

            tracker.add_data(insights_embedded=total_insights_embedded)

            return {"message": "Book and associated steps created successfully"}

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {e}") from e


def process_book(
    pdf_path: str,
    book_title: str,
    author: str,
    description: str,
    cover_url: str,
    category_list: List[str],
    user_id: str = "system",
):
    # Notice we combined the "started" and "failed" events into one single NodeTracker context
    with NodeTracker("book_processing", session_id=user_id) as tracker:
        tracker.add_data(book_title=book_title)
        
        try:
            processor = BookistProcessor(
                pdf_path, book_title, author, description, cover_url, category_list
            )
            book_data = processor.process()

            return create_book(book_data, user_id=user_id)
        except Exception as e:
            # Let the tracker naturally catch the exception and log it to Sentry & PostHog
            raise e