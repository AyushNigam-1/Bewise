from typing import List, Optional

from core.database import engine
from core.models import Insight, User
from sqlmodel import Session


class RecommendationRepository:
    @staticmethod
    def get_user_favourite_insights(user_id: str) -> List[int]:
        """Fetches the list of insight IDs the user has bookmarked."""
        with Session(engine) as session:
            user = session.get(User, user_id)
            return user.favourite_insights if user else []

    @staticmethod
    def get_insight(insight_id: int) -> Optional[Insight]:
        """Fetches a specific insight by its ID."""
        with Session(engine) as session:
            return session.get(Insight, insight_id)
