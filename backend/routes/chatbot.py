from typing import Optional
from pydantic import BaseModel

router = APIRouter()

# request model (backwards compatible: message + session_id)
class ChatRequest(BaseModel):
    message: str
    session_id: str
    # optional override from frontend later (not required)
    action: Optional[str] = None
    # optional explicit category selected by a UI
    selected_category: Optional[str] = None

# cheap keyword-based intent detector (no extra LLM call)
def is_recommendation_query(text: str) -> bool:
    q = text.lower()
    keywords = [
        "recommend", "suggest", "book", "looking for", "find me", "any book on",
        "which book", "best book", "suggest me", "help me find", "book about",
    ]
    for kw in keywords:
        if kw in q:
            return True
    return False

@router.post("/chat/ai")
def ai_reply(payload: ChatRequest):
    try:
        # 1) If frontend explicitly sets action, respect it
        if payload.action:
            action = payload.action.lower()
        else:
            # 2) Decide action automatically via keyword heuristic
            action = "recommend" if is_recommendation_query(payload.message) else "chat"

        # 3) Recommendation flow
        if action == "recommend":
            # Load categories
            categories = load_categories_file()

            # If frontend provided explicit selected_category, use it (if valid)
            if payload.selected_category:
                matched = [payload.selected_category] if payload.selected_category in categories else [payload.selected_category]
            else:
                # auto-match categories from user query
                matched = match_categories_for_query(payload.message, categories, top_k=3)

            # DB fetch
            conn = connect_db()
            if not conn:
                raise HTTPException(status_code=500, detail="Database connection failed")
            books = fetch_books_by_categories(conn, matched, limit=6)
            conn.close()

            # Build compact snippet for LLM
            book_lines = []
            for b in books:
                cat = b.get("category") or ""
                if isinstance(cat, (list, tuple)):
                    cat = ", ".join(cat)
                book_lines.append(f"- {b.get('title')} by {b.get('author')} (categories: {cat}) — {str(b.get('description',''))[:160]}")

            books_snippet = "\n".join(book_lines) if book_lines else "No direct book matches found."

            human_input = f"""
User query: {payload.message}
Matched categories: {matched}
Top candidate books:
{books_snippet}

Task: From the above candidate books and categories, recommend 2-3 best fits for the user's query. For each recommendation include a short reason (1-2 lines) and one actionable next step. Keep answer concise and friendly.
"""

            # Call the small suggestion chain (prompt -> llm)
            # suggest_chain is the prompt|llm runnable we created earlier
            suggestion_result = suggest_chain.invoke({"input": human_input})
            ai_text = getattr(suggestion_result, "content", str(suggestion_result))

            # Optionally: append this interaction to session history
            try:
                # best-effort: add user + ai message to session history so future chat keeps context
                hist = get_session_history(payload.session_id)
                # API for ChatMessageHistory may vary by version; try common helpers:
                if hasattr(hist, "add_user_message"):
                    hist.add_user_message(payload.message)
                if hasattr(hist, "add_ai_message"):
                    hist.add_ai_message(ai_text)
            except Exception:
                # don't fail the whole request if history append fails; just continue
                pass

            return {
                "mode": "recommend",
                "user": payload.message,
                "ai": ai_text,
                "matched_categories": matched,
                "books": books,
            }

        # 4) Default chat flow (preserves memory via RunnableWithMessageHistory)
        else:
            result = chat.invoke(
                {"input": payload.message},
                config={"configurable": {"session_id": payload.session_id}},
            )

            ai_text = getattr(result, "content", str(result))

            return {
                "mode": "chat",
                "user": payload.message,
                "ai": ai_text,
            }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
