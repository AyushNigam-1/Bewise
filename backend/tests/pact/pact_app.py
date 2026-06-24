import os
from sqlmodel import Session, SQLModel,delete
from core.database import engine
from core.models import Book, Insight, User
from unittest.mock import patch 
from datetime import datetime
import routes.books_routes
import services.vector
import core.redis
import controllers.recommendation_controller
patch('controllers.quiz_controller.quiz_graph.invoke', return_value={
    "generated_quiz": {
        "quiz": [
            {
                "question": "Who created Python?",
                "options": ["Guido van Rossum", "Elon Musk"],
                "correct_answer": "Guido van Rossum",
                "explanation": "He created it in 1991."
            }
        ]
    }
}).start()

patch('controllers.voice_controller.generate_audio_from_text', return_value=b"fake_wav_audio_bytes_for_pact_testing").start()

patch('controllers.chatbot_controller.rag_graph.invoke', return_value={
    "final_response": {
        "answer": "Python is a programming language.",
        "insights": {}
    }
}).start()

from app import app

routes.books_routes.create_book = lambda book_data: {"message": "Book and associated steps created successfully"}
services.vector.embed_and_upsert_insight = lambda *args, **kwargs: 1
core.redis.redis_client.get = lambda key: None
core.redis.redis_client.setex = lambda name, time, value: None
controllers.recommendation_controller.session_recommend = lambda user_id, insight_id: {
    "recommendations": [
        {"id": 100, "title": "A related insight", "category": "productivity"}
    ]
}

@app.post("/_pact/setup")
async def setup_state(request: dict):
    state = request.get("state")
    print(f"⚙️ Dynamically seeding DB for: {state}")
    
    if os.getenv("PACT_TESTING") == "true":
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            session.exec(delete(User))
            session.exec(delete(Book))
            session.exec(delete(Insight))

            fav_books = []
            fav_insights = []
            
            if state in ["a request to get all bookmarked books", "a request to get all bookmarked insights"]:
                fav_books = [1]
                fav_insights = [42]
                            
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
                category=["productivity","python", "ai"], 
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