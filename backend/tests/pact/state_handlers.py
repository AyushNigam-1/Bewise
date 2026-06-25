from datetime import datetime
from core.models import Book, Insight, User

def seed_default_state(session):
    """Seeds the standard database state used by most tests."""
    u1 = User(
        id="pact_test_user_123", 
        name="Pact User", 
        email="pact@test.com",
        createdAt=datetime.now(),
        updatedAt=datetime.now(),
        favourite_books=[],
        favourite_insights=[]
    )

    b1 = Book(
        id=1, 
        title="Atomic Habits", 
        author="James Clear",
        description="A book about habits",
        thumbnail="url.png",
        category=["productivity", "python", "ai"], 
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

def seed_bookmarked_state(session):
    """Seeds the database with a user who already has bookmarks."""
    seed_default_state(session) # Load the base data
    
    # Update the user we just added to have bookmarks
    user = session.query(User).filter(User.id == "pact_test_user_123").first()
    if user:
        user.favourite_books = [1]
        user.favourite_insights = [42]
        session.commit()

# ---------------------------------------------------------
# THE REGISTRY: Maps exact Pact state strings to functions
# ---------------------------------------------------------
STATE_REGISTRY = {
    # Auth / Bookmark specific states
    "a request to get all bookmarked books": seed_bookmarked_state,
    "a request to get all bookmarked insights": seed_bookmarked_state,
    "a request for session recommendations": seed_default_state,
    # Standard states (Books & AI)
    "a request to find books by categories": seed_default_state,
    "a request for book content": seed_default_state,
    "a request for book info": seed_default_state,
    "a request for step details": seed_default_state,
    "a request to create a book": seed_default_state,
    "a request to get all books": seed_default_state,
    "a request to toggle a book bookmark": seed_default_state,
    "a request to toggle an insight bookmark": seed_default_state,
    "a request to generate a quiz": seed_default_state,
    "a request to generate voice audio": seed_default_state,
    "a request to invoke the RAG chatbot": seed_default_state,
}