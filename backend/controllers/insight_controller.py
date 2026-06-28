import json
import logging
from typing import Any, Dict, List
from fastapi import HTTPException
from core.redis import CACHE_TTL

logger = logging.getLogger(__name__)

class InsightService:
    """Service class to handle book and insight content, injecting DB and Cache dependencies."""

    def __init__(self, redis_client, book_repo, insight_repo):
        self.redis = redis_client
        self.book_repo = book_repo
        self.insight_repo = insight_repo

    def get_book_content(
        self, title: str, category: List[str] = None, user_id: str = "anonymous"
    ) -> Dict[str, Any]:
        if category is None:
            category = []

        cache_key = f"book:content_combined:{title}:{'all' if not category else ','.join(sorted(category))}"
        
        log_context = {
            "user_id": user_id, 
            "action": "viewed_book_content",
            "book_title": title, 
            "categories_requested": category
        }

        cached_data = self.redis.get(cache_key)

        if cached_data:
            data = json.loads(cached_data)
            log_context.update({"source": "redis_cache", "values_count": len(data.get("values", []))})
            logger.info("Book content fetched", extra=log_context)
            return data

        try:
            book = self.book_repo.get_book_by_title(title)

            if not book:
                logger.warning("Book content not found", extra=log_context)
                raise HTTPException(status_code=404, detail="Book not found")

            content = book.content or {}

            keys_result = [
                {
                    "name": key,
                    "icon": value.get("icon", ""),
                    "description": value.get("description", ""),
                    "steps_count": str(len(value.get("steps", []))),
                }
                for key, value in content.items()
            ]

            values_result = []
            keys_to_use = category if category else list(content.keys())

            all_step_ids = []
            for key in keys_to_use:
                if key in content:
                    all_step_ids.extend(content[key].get("steps", []))

            if all_step_ids:
                steps_data = self.insight_repo.get_insights_by_ids(all_step_ids)

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

            self.redis.setex(cache_key, CACHE_TTL, json.dumps(result))
            log_context.update({
                "source": "database",
                "keys_count": len(keys_result),
                "values_count": len(values_result),
            })
            logger.info("Book content fetched", extra=log_context)

            return result

        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Failed to get book content", extra=log_context)
            raise HTTPException(status_code=500, detail=str(e)) from e


    def get_step_details(self, step_id: int, user_id: str = "anonymous") -> Dict[str, Any]:
        cache_key = f"insight:{step_id}"
        log_context = {"user_id": user_id, "action": "read_insight_step", "step_id": step_id}

        cached_data = self.redis.get(cache_key)

        if cached_data:
            data = json.loads(cached_data)
            log_context.update({"source": "redis_cache", "book_title": data.get("book_name")})
            logger.info("Step details fetched", extra=log_context)
            return data

        try:
            insight = self.insight_repo.get_insight_by_id(step_id)

            if not insight:
                logger.warning("Step not found", extra=log_context)
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

            self.redis.setex(cache_key, CACHE_TTL, json.dumps(result))
            log_context.update({"source": "database", "book_title": insight.book_name})
            logger.info("Step details fetched", extra=log_context)
            
            return result

        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Failed to fetch step details", extra=log_context)
            raise HTTPException(status_code=500, detail=str(e)) from e


def get_insight_service() -> InsightService:
    from core.redis import redis_client
    from repositories.book_repository import BookRepository
    from repositories.insight_repository import InsightRepository
    
    return InsightService(
        redis_client=redis_client, 
        book_repo=BookRepository, 
        insight_repo=InsightRepository
    )