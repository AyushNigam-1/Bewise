from typing import List, Optional, Tuple

from core.database import engine
from core.models import Book, Insight, User
from sqlmodel import Session, select


class BookmarkRepository:
    @staticmethod
    def toggle_book(user_id: str, book_id: int) -> Optional[Tuple[bool, List[int]]]:
        """Toggles a book bookmark. Returns None if user not found, else (action, updated_list)."""
        with Session(engine) as session:
            user = session.get(User, user_id)
            if not user:
                return None

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
            return action, books

    @staticmethod
    def toggle_insight(
        user_id: str, insight_id: int
    ) -> Optional[Tuple[bool, List[int]]]:
        """Toggles an insight bookmark. Returns None if user not found, else (action, updated_list)."""
        with Session(engine) as session:
            user = session.get(User, user_id)
            if not user:
                return None

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
            return action, insights

    @staticmethod
    def get_bookmarked_books(user_id: str) -> Optional[List[Book]]:
        """Fetches bookmarked books. Returns None if user not found."""
        with Session(engine) as session:
            user = session.get(User, user_id)
            if not user:
                return None

            book_ids = user.favourite_books or []
            if not book_ids:
                return []

            statement = select(Book).where(Book.id.in_(book_ids))
            return session.exec(statement).all()

    @staticmethod
    def get_bookmarked_insights(user_id: str) -> Optional[List[Insight]]:
        """Fetches bookmarked insights. Returns None if user not found."""
        with Session(engine) as session:
            user = session.get(User, user_id)
            if not user:
                return None

            insight_ids = user.favourite_insights or []
            if not insight_ids:
                return []

            statement = select(Insight).where(Insight.id.in_(insight_ids))
            return session.exec(statement).all()
