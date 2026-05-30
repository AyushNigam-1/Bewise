from typing import Callable, List, Optional

from core.database import engine
from core.models import Book, Insight
from sqlalchemy import Text, cast
from sqlalchemy.dialects.postgresql import ARRAY
from sqlmodel import Session, select


class BookRepository:
    @staticmethod
    def get_all_books() -> List[Book]:
        """Fetches all books from the database."""
        with Session(engine) as session:
            return session.exec(select(Book)).all()

    @staticmethod
    def get_books_by_categories(categories: List[str]) -> List[Book]:
        """Fetches books filtered by categories, or all books if none provided."""
        with Session(engine) as session:
            if not categories:
                return session.exec(select(Book)).all()

            statement = select(Book).where(
                Book.category.overlap(cast(categories, ARRAY(Text)))
            )
            return session.exec(statement).all()

    @staticmethod
    def get_book_by_title(title: str) -> Optional[Book]:
        """Fetches a single book by its exact title."""
        with Session(engine) as session:
            return session.exec(select(Book).where(Book.title == title)).first()

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

    @staticmethod
    def create_book_transaction(book_data: dict, embed_callback: Callable) -> int:
        """
        Handles the complex transaction of creating a book and its nested insights.
        Uses a callback to execute the vector embedding inside the safe transaction block.
        Returns the total number of insights embedded.
        """
        total_insights_embedded = 0

        with Session(engine) as session:
            book_title = book_data["Title"]
            content_with_step_ids = {}

            if "Content" in book_data and isinstance(book_data["Content"], dict):
                for category_name, category_data in book_data["Content"].items():
                    category_icon = category_data.get("icon", "📌")

                    content_with_step_ids[category_name] = {
                        "icon": category_icon,
                        "description": category_data.get("description"),
                        "steps": [],
                    }

                    for step in category_data.get("steps", []):
                        new_insight = Insight(
                            book_name=book_title,
                            category_name=category_name,
                            category_icon=category_icon,
                            title=step["step"],
                            description=step["description"],
                            detailed_breakdown=step["detailed_breakdown"],
                        )
                        session.add(new_insight)
                        session.flush()

                        step_id = new_insight.id
                        content_with_step_ids[category_name]["steps"].append(step_id)

                        # Trigger the AI embedding logic passed from the controller
                        embed_callback(
                            insight_id=step_id,
                            book_name=book_title,
                            category=category_name,
                            category_icon=category_icon,
                            title=step["step"],
                            description=step["description"],
                        )
                        total_insights_embedded += 1

            new_book = Book(
                title=book_data["Title"],
                author=book_data["Author"],
                description=book_data["Description"],
                thumbnail=book_data["Thumbnail"],
                category=book_data["Category"],
                content=content_with_step_ids,
            )
            session.add(new_book)
            session.commit()

            return total_insights_embedded
