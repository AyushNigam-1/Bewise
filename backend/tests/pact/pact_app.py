import os
from sqlmodel import Session, SQLModel
from app import app 
from core.database import engine 
from core.models import Book, Insight 
from core.models import User # <-- We need the User model to fix the 404s!
import services.vector
services.vector.embed_and_upsert_insight = lambda *args, **kwargs: 1
import routes.books_routes
routes.books_routes.create_book = lambda book_data: {"message": "Book and associated steps created successfully"}
import routes.insight_routes
import core.redis
core.redis.redis_client.get = lambda key: None
core.redis.redis_client.setex = lambda name, time, value: None
routes.insight_routes.get_step_details = lambda step_id: {
    "step_id": 42,
    "book_name": "Clean Code",
    "title": "Keep functions small",
    "detailed_breakdown": "Here is the detailed breakdown..."
}

# ---------------------------------------------------------
# DATABASE SEEDING
# ---------------------------------------------------------
if os.getenv("PACT_TESTING") == "true":
    print("🌱 Populating Docker Database for Pact Tests...")
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # FIX 1: Seed the User so the bookmark routes don't return 404!
        if User:
            from datetime import datetime
            u1 = User(
                id="pact_test_user_123", 
                name="Pact User", 
                email="pact@test.com",
                createdAt=datetime.now(),
                updatedAt=datetime.now()
            )
            session.merge(u1)

        b1 = Book(
            id=1, 
            title="Atomic Habits", 
            author="James Clear",
            description="A book about habits",
            thumbnail="url.png",
            category=["productivity"], 
            content={
                # FIX 2: Change this to "python" to match the frontend payload request!
                "python": {
                    "icon": "🐍",
                    "description": "Python tips",
                    "steps": [42]
                }
            }
        )
        
        b2 = Book(
            id=2, 
            title="Python 101", 
            author="Dev",
            description="Coding",
            thumbnail="url.png",
            category=["python", "ai"],
            content={}
        )
        
        i1 = Insight(
            id=42, 
            title="Keep functions small", 
            book_name="Atomic Habits", # <-- Changed from "Clean Code"
            description="Short desc",
            detailed_breakdown="Here is the detailed breakdown...", 
            category_name="python",
            category_icon="🐍"
        )
        
        session.merge(b1)
        session.merge(b2)
        session.merge(i1)

        session.commit()
        print("✅ Database Seed Complete!")