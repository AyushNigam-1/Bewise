import os
import traceback
from typing import Optional, Dict, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.output_parsers import PydanticOutputParser
from src.utils.vector import search_insights
from urllib.parse import unquote  # Add this import at the top
router = APIRouter()

store: Dict[str, ChatMessageHistory] = {}

def get_session_history(session_id: str) -> ChatMessageHistory:
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]

llm = ChatGroq(
    model_name="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
)

class RAGResponse(BaseModel):
    answer: str = Field(description="Short answer to user question")
    ids: List[int] = Field(description="List of relevant insight ids. Empty if none.")

parser = PydanticOutputParser(pydantic_object=RAGResponse)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are Bookist AI. You ONLY answer using provided insights."),
    ("human", "{input}\n\n{format}")
])

chain = prompt | llm

chat = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
)

class ChatRequest(BaseModel):
    message: str
    session_id: str
    book: Optional[str] = None


@router.post("/chat/ai")
def ai_reply(payload: ChatRequest):
    try:
        user_query = payload.message
        book = unquote(payload.book) if payload.book else None
        pinecone_hits = search_insights(user_query,book, top_k=5)
        # Build context
        blocks = []
        for h in pinecone_hits:
            blocks.append(
                f"""
                    Id: {h["insight_id"]}
                    Book: {h["book"]}
                    Category: {h["category"]}
                    Title: {h["title"]}
                    Description: {h["description"]}
                    """
                )

        context = "\n---\n".join(blocks)

        grounded_prompt = f"""
            User question:
            {user_query}

            Candidate insights:
            {context}

            Rules:

            - Select ONLY insights that directly answer the question.
            - If nothing matches, return empty ids list [].
            - Do NOT hallucinate.

            Return structured JSON.
        """

        format_instructions = parser.get_format_instructions()

        result = chat.invoke(
            {
                "input": grounded_prompt,
                "format": format_instructions
            },
            config={"configurable": {"session_id": payload.session_id}},
        )

        parsed: RAGResponse = parser.parse(result.content)

        if not parsed.ids:
            return {
                "answer": "I could not find any relevant insight for this question.",
                "insights": {}
            }

        final_hits = [h for h in pinecone_hits if h["insight_id"] in parsed.ids]

        books = {}

        for hit in final_hits:
            book = hit["book"]

            if book not in books:
                books[book] = []

            books[book].append({
                "id": hit["insight_id"],
                "title": hit["title"],
                "category": hit["category"],
                "category_icon": hit["category_icon"],
                "description": hit["description"],
                "link": f"http://localhost:3000/insight/{hit['book'].replace(' ', '%20')}/{hit['category'].replace(' ', '%20')}/{hit['insight_id']}",
            })

        return {
            "answer": parsed.answer,
            "insights": books
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, str(e))
