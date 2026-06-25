import os
from sqlmodel import Session, SQLModel, delete
from core.database import engine
from core.models import Book, Insight, User
from unittest.mock import patch 
from tests.pact.state_handlers import STATE_REGISTRY # 🚨 Import the Registry

# ---------------------------------------------------------
# 🚨 1. START PATCHES FIRST (Hijack LangGraph directly!)
# ---------------------------------------------------------
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

# ---------------------------------------------------------
# 🚨 2. NOW IMPORT FASTAPI
# ---------------------------------------------------------
from app import app
import routes.books_routes
import services.vector
import core.redis
import controllers.recommendation_controller

# Standard Lambda Mocks
routes.books_routes.create_book = lambda book_data: {"message": "Book and associated steps created successfully"}
services.vector.embed_and_upsert_insight = lambda *args, **kwargs: 1
core.redis.redis_client.get = lambda key: None
core.redis.redis_client.setex = lambda name, time, value: None
controllers.recommendation_controller.session_recommend = lambda user_id, insight_id: {
    "recommendations": [
        {"id": 100, "title": "A related insight", "category": "productivity"}
    ]
}

# ---------------------------------------------------------
# 🚨 3. THE DYNAMIC WEBHOOK (Powered by the Registry)
# ---------------------------------------------------------
@app.post("/_pact/setup")
async def setup_state(request: dict):
    state = request.get("state")
    print(f"⚙️ Dynamically seeding DB for: {state}")
    
    if os.getenv("PACT_TESTING") == "true":
        SQLModel.metadata.create_all(engine)
        
        with Session(engine) as session:
            # 1. Wipe the DB clean
            session.exec(delete(User))
            session.exec(delete(Book))
            session.exec(delete(Insight))

            # 2. Look up the specific seeding function for this state
            handler = STATE_REGISTRY.get(state)
            
            # 3. Execute the function if it exists
            if handler:
                handler(session)
            else:
                print(f"⚠️ Warning: No handler mapped for '{state}'. Database left empty.")

            session.commit()
            
    return {"result": "setup complete"}