from typing import List, Dict
from sqlmodel import Session, select, or_
from core.database import engine
from core.models import Book, Insight

def get_book_names_by_ids(book_ids: List[int]) -> List[str]:
    if not book_ids:
        return []
    with Session(engine) as db:
        books = db.exec(select(Book).where(Book.id.in_(book_ids))).all()
        return [b.title for b in books]

def get_explicit_insights(insight_ids: List[int], book_names: List[str]) -> List[Dict]:
    conditions = []
    if insight_ids:
        conditions.append(Insight.id.in_(insight_ids))
    if book_names:
        conditions.append(Insight.book_name.in_(book_names))
        
    if not conditions:
        return []

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