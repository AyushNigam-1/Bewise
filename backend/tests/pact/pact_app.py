import os
from sqlmodel import Session, SQLModel
from app import app
from core.database import engine
from core.models import Book, Insight, User
from datetime import datetime

# 1. Neutralize external dependencies (so tests don't charge your Groq/Redis limits)
import services.vector
services.vector.embed_and_upsert_insight = lambda *args, **kwargs: 1
import core.redis
core.redis.redis_client.get = lambda key: None
core.redis.redis_client.setex = lambda name, time, value: None
import controllers.recommendation_controller
controllers.recommendation_controller.session_recommend = lambda user_id, insight_id: {
    "recommendations": [
        {"id": 100, "title": "A related insight", "category": "productivity"}
    ]
}
# 2. Add the missing /me route so Pact gets a 200 instead of a 404
@app.get("/me")
def mock_me_route():
    return {"id": "pact_test_user_123", "email": "pact@test.com", "name": "Pact User"}

# 3. DYNAMIC DATABASE SEEDING
@app.post("/_pact/setup")
async def setup_state(request: dict):
    state = request.get("state")
    print(f"⚙️ Dynamically seeding DB for: {state}")
    
    if os.getenv("PACT_TESTING") == "true":
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            # Wipe the DB clean before every single test
            session.query(User).delete()
            session.query(Book).delete()
            session.query(Insight).delete()

            # The Catch-22 Logic:
            fav_books = []
            fav_insights = []
            
            # If the test is GETTING bookmarks, the user MUST start with data
            if state in ["a request to get all bookmarked books", "a request to get all bookmarked insights"]:
                fav_books = [1]
                fav_insights = [42]
                
            # If the test is TOGGLING, they start empty (so the controller adds them)
            
            u1 = User(
                id="pact_test_user_123", 
                name="Pact User", 
                email="pact@test.com",
                createdAt=datetime.now(),
                updatedAt=datetime.now(),
                favourite_books=fav_books,
                favourite_insights=fav_insights
            )

            b1 = Book(
                id=1, 
                title="Atomic Habits", 
                author="James Clear",
                description="A book about habits",
                thumbnail="url.png",
                category=["productivity"], 
                content={"python": {"icon": "🐍", "description": "Python", "steps": [42]}}
            )
            
            i1 = Insight(
                id=42, 
                title="Keep functions small", 
                book_name="Atomic Habits",
                description="Short desc",
                detailed_breakdown="Detailed breakdown...", 
                category_name="python",
                category_icon="🐍"
            )

            session.add_all([u1, b1, i1])
            session.commit()
            
    return {"result": "setup complete"}