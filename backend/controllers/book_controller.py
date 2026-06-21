import json
import logging
from typing import Any, Dict, List
from fastapi import HTTPException
from core.redis import CACHE_TTL, redis_client
from repositories.book_repository import BookRepository
from services.vector import embed_and_upsert_insight
from src.processor import BookistProcessor
from src.utils.file_operations import load_json_file

logger = logging.getLogger(__name__)


def get_all_books(user_id: str = "anonymous") -> List[Dict[str, Any]]:
    cache_key = "books:all"
    log_context = {"user_id": user_id, "action": "fetched_all_books"}

    cached_data = redis_client.get(cache_key)

    if cached_data:
        books = json.loads(cached_data)
        log_context.update({"source": "redis_cache", "count": len(books)})
        logger.info("Fetched all books", extra=log_context)
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
        log_context.update({"source": "database", "count": len(book_list)})
        logger.info("Fetched all books", extra=log_context)
        
        return book_list

    except Exception as e:
        logger.exception("Failed to fetch all books", extra=log_context)
        raise HTTPException(status_code=500, detail="Database connection failed") from e


def find_books_by_categories(
    categories: List[str], user_id: str = "anonymous"
) -> Dict[str, Any]:
    cache_key = (
        "books_with_cats:all"
        if not categories
        else f"books_with_cats:{','.join(sorted(categories))}"
    )

    log_context = {
        "user_id": user_id, 
        "action": "searched_books_by_category",
        "categories": categories
    }

    cached_data = redis_client.get(cache_key)

    if cached_data:
        data = json.loads(cached_data)
        log_context.update({"source": "redis_cache", "books_count": len(data.get("books", []))})
        logger.info("Books found by category", extra=log_context)
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
        log_context.update({
            "source": "database",
            "books_count": len(books),
            "cats_count": len(filtered_categories),
        })
        logger.info("Books found by category", extra=log_context)

        return result

    except Exception as e:
        logger.exception("Failed to search books by category", extra=log_context)
        raise HTTPException(status_code=500, detail=str(e)) from e


def get_book_info(title: str, user_id: str = "anonymous") -> Dict[str, Any]:
    cache_key = f"book:info:{title}"
    log_context = {"user_id": user_id, "action": "viewed_book_details", "book_title": title}

    cached_data = redis_client.get(cache_key)

    if cached_data:
        log_context["source"] = "redis_cache"
        logger.info("Book info fetched", extra=log_context)
        return json.loads(cached_data)

    try:
        book = BookRepository.get_book_by_title(title)

        if not book:
            log_context["not_found"] = True
            logger.warning("Book not found", extra=log_context)
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
        log_context.update({"source": "database", "total_insights": total_steps})
        logger.info("Book info fetched", extra=log_context)
        
        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Database error fetching book info", extra=log_context)
        raise HTTPException(status_code=500, detail="Database error") from e


def create_book(book_data: Dict, user_id: str = "system") -> Dict[str, str]:
    log_context = {
        "user_id": user_id, 
        "action": "book_created_and_embedded",
        "book_title": book_data.get("Title")
    }

    try:
        total_insights_embedded = BookRepository.create_book_transaction(
            book_data=book_data, embed_callback=embed_and_upsert_insight
        )

        # Invalidate all book caches so the new book appears immediately
        for key in redis_client.scan_iter("books:*"):
            redis_client.delete(key)

        log_context["insights_embedded"] = total_insights_embedded
        logger.info("Book successfully created and embedded", extra=log_context)

        return {"message": "Book and associated steps created successfully"}

    except Exception as e:
        logger.exception("Database error during book creation", extra=log_context)
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
    log_context = {
        "user_id": user_id,
        "action": "book_processing",
        "book_title": book_title
    }
    
    try:
        processor = BookistProcessor(
            pdf_path, book_title, author, description, cover_url, category_list
        )
        book_data = processor.process()

        logger.info("PDF processed successfully, passing to creation", extra=log_context)
        return create_book(book_data, user_id=user_id)
        
    except Exception as e:
        logger.exception("Book processing failed", extra=log_context)
        raise e