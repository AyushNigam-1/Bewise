import json
import time
import traceback
from typing import List, Dict, Any
from fastapi import HTTPException
from sqlmodel import Session, select
from core.database import engine
from core.models import Book, Insight
from services.vector import embed_and_upsert_insight
from src.processor import BookistProcessor
from src.utils.file_operations import load_json_file
from core.redis import redis_client, CACHE_TTL
from core.analytics import posthog

def get_all_books(user_id: str = "anonymous") -> List[Dict[str, Any]]:
    cache_key = "books:all"
    cached_data = redis_client.get(cache_key)
    
    if cached_data:
        books = json.loads(cached_data)
        posthog.capture(distinct_id=user_id, event='fetched_all_books', properties={'source': 'redis_cache', 'count': len(books)})
        return books

    try:
        with Session(engine) as session:
            books_data = session.exec(select(Book)).all()

            book_list = [
                {
                    "id": b.id, "title": b.title, "author": b.author,
                    "thumbnail": b.thumbnail, "description": b.description, "category": b.category
                }
                for b in books_data
            ]

        redis_client.setex(cache_key, CACHE_TTL, json.dumps(book_list))
        posthog.capture(distinct_id=user_id, event='fetched_all_books', properties={'source': 'database', 'count': len(book_list)})
        return book_list
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database connection failed")


def find_books_by_categories(categories: List[str], user_id: str = "anonymous") -> List[Dict[str, Any]]:
    cache_key = "books:all" if not categories else f"books:categories:{','.join(sorted(categories))}"
    cached_data = redis_client.get(cache_key)
    
    if cached_data:
        books = json.loads(cached_data)
        posthog.capture(distinct_id=user_id, event='searched_books_by_category', properties={'categories': categories, 'source': 'redis_cache', 'results_count': len(books)})
        return books

    try:
        with Session(engine) as session:
            if not categories:
                books_data = session.exec(select(Book)).all()
            else:
                statement = select(Book).where(Book.category.overlap(categories))
                books_data = session.exec(statement).all()

            books = [
                {
                    "id": b.id, "title": b.title, "author": b.author,
                    "thumbnail": b.thumbnail, "description": b.description, 
                    "category": b.category, "content": b.content
                }
                for b in books_data
            ]

        redis_client.setex(cache_key, CACHE_TTL, json.dumps(books))
        posthog.capture(distinct_id=user_id, event='searched_books_by_category', properties={'categories': categories, 'source': 'database', 'results_count': len(books)})
        return books
        
    except Exception as e:
        posthog.capture(distinct_id=user_id, event='error_searching_categories', properties={'error': str(e), 'categories': categories})
        raise HTTPException(status_code=500, detail=str(e))


def get_book_info(title: str, user_id: str = "anonymous") -> Dict[str, Any]:
    cache_key = f"book:info:{title}"
    cached_data = redis_client.get(cache_key)
    
    if cached_data:
        data = json.loads(cached_data)
        posthog.capture(distinct_id=user_id, event='viewed_book_details', properties={'book_title': title, 'source': 'redis_cache'})
        return data

    try:
        with Session(engine) as session:
            book = session.exec(select(Book).where(Book.title == title)).first()

            if not book:
                posthog.capture(distinct_id=user_id, event='book_not_found', properties={'book_title': title})
                raise HTTPException(status_code=404, detail="Book not found")

        categories_str = ", ".join(book.category) if book.category else ""

        num_keys = len(book.content or {})
        total_steps = sum(len((book.content or {}).get(key, {}).get("steps", [])) for key in (book.content or {}).keys())

        response_data = {
            "id": book.id, "title": book.title, "thumbnail": book.thumbnail, "author": book.author,
            "description": book.description, "sub_categories_count": num_keys,
            "total_insights": total_steps, "categories": categories_str 
        }

        redis_client.setex(cache_key, CACHE_TTL, json.dumps(response_data))
        posthog.capture(distinct_id=user_id, event='viewed_book_details', properties={'book_title': title, 'source': 'database', 'total_insights': total_steps})
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error")


def get_content_keys(title: str, user_id: str = "anonymous") -> List[Dict[str, str]]:
    cache_key = f"book:content_keys:{title}"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    try:
        with Session(engine) as session:
            book = session.exec(select(Book).where(Book.title == title)).first()
            
            if not book:
                raise HTTPException(status_code=404, detail="Book not found")

        content = book.content or {}
        result = [
            {
                "name": key, "icon": value.get("icon", ""),
                "description": value.get("description", ""), "steps_count": str(len(value.get("steps", [])))
            }
            for key, value in content.items()
        ]

        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
        posthog.capture(distinct_id=user_id, event='viewed_content_keys', properties={'book_title': title, 'keys_count': len(result)})
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database connection failed")


def get_content_values(title: str, category: List[str], user_id: str = "anonymous") -> List[Dict[str, Any]]:
    cache_key = f"book:content_values:{title}:{'all' if not category else ','.join(sorted(category))}"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    try:
        with Session(engine) as session:
            book = session.exec(select(Book).where(Book.title == title)).first()
            
            if not book:
                raise HTTPException(status_code=404, detail="Book not found")
            
            content = book.content or {}
            results = []
            keys_to_use = category if category else list(content.keys())

            for key in keys_to_use:
                if key in content:
                    step_ids = content[key].get("steps", [])

                    if not step_ids: continue

                    steps_data = session.exec(select(Insight).where(Insight.id.in_(step_ids))).all()

                    for step in steps_data:
                        results.append({
                            "icon": step.category_icon, 
                            "category": key, 
                            "step_id": step.id,
                            "step": step.title, 
                            "description": step.description
                        })

            if not results:
                raise HTTPException(status_code=404, detail="No matching categories or steps found")

            redis_client.setex(cache_key, CACHE_TTL, json.dumps(results))
            posthog.capture(distinct_id=user_id, event='viewed_content_values', properties={'book_title': title, 'categories_requested': category, 'results_count': len(results)})
            return results

    except Exception as e:
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=str(e))


def get_step_details(step_id: int, user_id: str = "anonymous") -> Dict[str, Any]:
    cache_key = f"insight:{step_id}"
    cached_data = redis_client.get(cache_key)
    
    if cached_data:
        data = json.loads(cached_data)
        posthog.capture(distinct_id=user_id, event='read_insight_step', properties={'step_id': step_id, 'book_title': data.get('book_name')})
        return data

    try:
        with Session(engine) as session:
            insight = session.get(Insight, step_id)

            if not insight:
                raise HTTPException(status_code=404, detail="Step not found")

            result = {
                "step_id": insight.id, "book_name": insight.book_name, "category": insight.category_name,
                "title": insight.title, "description": insight.description, "detailed_breakdown": insight.detailed_breakdown,
                "category_icon": insight.category_icon 
            }

        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
        posthog.capture(distinct_id=user_id, event='read_insight_step', properties={'step_id': step_id, 'book_title': insight.book_name})
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def create_book(book_data: Dict, user_id: str = "system") -> Dict[str, str]:
    start_time = time.time()
    
    try:            
        with Session(engine) as session:
            book_title = book_data["Title"]
            content_with_step_ids = {}
            total_insights_embedded = 0

            if "Content" in book_data and isinstance(book_data["Content"], dict):
                for category_name, category_data in book_data["Content"].items():
                    category_icon = category_data.get("icon", "📌")
                    
                    content_with_step_ids[category_name] = {
                        "icon": category_icon,
                        "description": category_data.get("description"),
                        "steps": []
                    }
                    
                    for step in category_data.get("steps", []):
                        new_insight = Insight(
                            book_name=book_title,
                            category_name=category_name,
                            category_icon=category_icon,
                            title=step["step"],
                            description=step["description"],
                            detailed_breakdown=step["detailed_breakdown"]
                        )
                        session.add(new_insight)
                        session.flush() 
                        
                        step_id = new_insight.id
                        content_with_step_ids[category_name]["steps"].append(step_id)
                        
                        embed_and_upsert_insight(
                            insight_id=step_id, book_name=book_title, category=category_name,
                            category_icon=category_icon, title=step["step"], description=step["description"],
                        )
                        total_insights_embedded += 1
                        
                new_book = Book(
                    title=book_data["Title"],
                    author=book_data["Author"],
                    description=book_data["Description"],
                    thumbnail=book_data["Thumbnail"],
                    category=book_data["Category"],
                    content=content_with_step_ids
                )
                session.add(new_book)

            session.commit()

        for key in redis_client.scan_iter("books:*"):
            redis_client.delete(key)

        latency = time.time() - start_time
        posthog.capture(distinct_id=user_id, event='book_created_and_embedded', properties={
            'book_title': book_title, 
            'insights_embedded': total_insights_embedded,
            'latency_seconds': round(latency, 2)
        })

        return {"message": "Book and associated steps created successfully"}
    
    except Exception as e:
        posthog.capture(distinct_id=user_id, event='error_creating_book', properties={'book_title': book_data.get("Title"), 'error': str(e)})
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


def process_book(pdf_path: str, book_title: str, author: str, description: str, cover_url: str, category_list: List[str], user_id: str = "system"):
    posthog.capture(distinct_id=user_id, event='book_processing_started', properties={'book_title': book_title})
    
    try:
        processor = BookistProcessor(pdf_path, book_title, author, description, cover_url, category_list)
        book_data = processor.process()
        
        return create_book(book_data, user_id=user_id)
    except Exception as e:
        posthog.capture(distinct_id=user_id, event='book_processing_failed', properties={'book_title': book_title, 'error': str(e)})
        raise e

def get_categories(user_id: str = "anonymous") -> List[Dict[str, str]]:
    cache_key = "categories:all"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    try:
        content = load_json_file("", "categories.json", {})
        result = [
            {"name": key, "icon": value.get("icon", ""), "description": value.get("description", "")}
            for key, value in content.items()
        ]
        
        redis_client.setex(cache_key, CACHE_TTL * 2, json.dumps(result)) 
        posthog.capture(distinct_id=user_id, event='fetched_categories_list', properties={'count': len(result)})
        return result
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")