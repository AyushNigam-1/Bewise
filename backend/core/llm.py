import os
from typing import Dict, List
from pydantic import BaseModel, Field
from langchain_groq import ChatGroq
from langchain_community.chat_message_histories import ChatMessageHistory
from dotenv import load_dotenv
load_dotenv()

store: Dict[str, ChatMessageHistory] = {}

def get_session_history(session_id: str) -> ChatMessageHistory:
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]

class RAGResponse(BaseModel):
    answer: str = Field(description="Short answer to user question")
    ids: List[int] = Field(description="List of relevant insight ids. Empty if none.")

llm = ChatGroq(
    model_name="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
)