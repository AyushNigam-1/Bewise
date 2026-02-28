from typing import Optional, List
from fastapi import APIRouter
from pydantic import BaseModel
from controllers.chatbot_handler import ai_reply_logic

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: str
    books_ids: Optional[List[str]] = None 
    insights_ids: Optional[List[int]] = None

@router.post("/chat/ai")
def ai_reply(payload: ChatRequest):
    return ai_reply_logic(
        message=payload.message,
        session_id=payload.session_id,
        books_ids=payload.books_ids,
        insights_ids=payload.insights_ids
    )