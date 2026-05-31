from datetime import datetime, timezone

from core.models import Book, Insight, User
from factory.base import Factory
from factory.declarations import LazyFunction, Sequence
from factory.faker import Faker


class BookFactory(Factory):
    class Meta:  # type: ignore
        model = Book

    id = Sequence(lambda n: n + 1)
    title = Faker("sentence", nb_words=3)
    author = Faker("name")
    thumbnail = "default_thumb.png"
    description = Faker("paragraph")
    category = ["python"]
    content = {"python": {"steps": [1]}}


class InsightFactory(Factory):
    class Meta:  # type: ignore
        model = Insight

    id = Sequence(lambda n: n + 1)
    book_name = Faker("sentence", nb_words=3)
    category_name = "python"
    category_icon = "🐍"
    title = Faker("sentence", nb_words=4)
    description = Faker("paragraph")
    detailed_breakdown = Faker("paragraph")


class UserFactory(Factory):
    class Meta:  # type: ignore
        model = User

    id = Sequence(lambda n: f"user_{n}")
    name = Faker("name")
    email = Faker("email")
    emailVerified = True
    createdAt = LazyFunction(lambda: datetime.now(timezone.utc))
    updatedAt = LazyFunction(lambda: datetime.now(timezone.utc))
    favourite_books = []
    favourite_insights = []
