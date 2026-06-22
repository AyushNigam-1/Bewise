from typing import List,Optional
from sqlmodel import Session, select, or_
from core.database import engine
from core.models import Insight


class InsightRepository:
    @staticmethod
    def get_insights_by_ids(step_ids: List[int]) -> List[Insight]:
        """Fetches a batch of insights using a list of IDs."""
        if not step_ids:
            return []
        with Session(engine) as session:
            return session.exec(select(Insight).where(Insight.id.in_(step_ids))).all()

    @staticmethod
    def get_insight_by_id(step_id: int) -> Optional[Insight]:
        """Fetches a specific insight by ID."""
        with Session(engine) as session:
            return session.get(Insight, step_id)

        with Session(engine) as db:
            statement = select(Insight).where(or_(*conditions)).limit(15)
            rows = db.exec(statement).all()
          
            return [
                {
                    "insight_id": r.id,
                    "book": r.book_name,
                    "category": r.category_name,
                    "title": r.title,
                    "description": r.description,
                    "detailed_breakdown": r.detailed_breakdown,
                    "category_icon":r.category_icon,
                    "source": "explicit",
                }
                for r in rows
            ]