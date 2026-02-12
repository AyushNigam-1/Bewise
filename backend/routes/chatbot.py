import os
import traceback
from typing import Optional, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory

from src.utils.vector import search_insights

router = APIRouter()

# -------------------------
# Memory Store
# -------------------------

store: Dict[str, ChatMessageHistory] = {}

def get_session_history(session_id: str) -> ChatMessageHistory:
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]

# -------------------------
# Prompt
# -------------------------

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are Bookist AI. Be clear, helpful, and concise."),
    ("human", "{input}")
])

# -------------------------
# Groq LLM
# -------------------------

llm = ChatGroq(
    model_name="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
)

# -------------------------
# Chain + Memory
# -------------------------

chain = prompt | llm

chat = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
)

# -------------------------
# Request Model
# -------------------------

class ChatRequest(BaseModel):
    message: str
    session_id: str
    action: Optional[str] = None
    selected_category: Optional[str] = None

# -------------------------
# Chat Endpoint (RAG)
# -------------------------

@router.post("/chat/ai")
def ai_reply(payload: ChatRequest):
    try:
        user_query = payload.message

        # 1. Pinecone semantic search
        pinecone_hits = search_insights(user_query, top_k=5)

        # Fallback to normal chat
        if not pinecone_hits:
            result = chat.invoke(
                {"input": user_query},
                config={"configurable": {"session_id": payload.session_id}},
            )

            return {
                "mode": "chat",
                "ai": result.content,
            }

        # 2. Build context from Pinecone metadata
        context_blocks = []
        for hit in pinecone_hits:
            context_blocks.append(
                f"""
            Id:{hit.get("insight_id")}
            Book: {hit.get("book")}
            Category: {hit.get("category")}
            Insight: {hit.get("title")}
            Explanation: {hit.get("description")}
            """
            )

        context_text = "\n---\n".join(context_blocks)

        # 3. Grounded prompt
        grounded_prompt  = f"""
            You are Bookist AI.

            User question:
            {user_query}

            Below are candidate insights.

            Return TWO things:

            1. A short explanation answering the question.
            2. A comma-separated list of relevant Insight IDs.

            Rules:
            - Only select IDs that directly answer the question.
            - Do NOT select unrelated insights.
            - If none match, return: NONE

            Format EXACTLY:

            ANSWER:
            <your answer>

            IDS:
            <id1,id2>

            CANDIDATE INSIGHTS:

            {context_text}
            """

        # 4. Groq with memory
        result = chat.invoke(
            {"input": grounded_prompt},
            config={"configurable": {"session_id": payload.session_id}},
        )
        raw = result.content

        answer_part = raw.split("IDS:")[0].replace("ANSWER:", "").strip()
        ids_part = raw.split("IDS:")[1].strip()

        if ids_part == "NONE":
            return {
                "mode": "rag",
                "answer": answer_part,
                "insights": []
            }

        selected_ids = [int(x.strip()) for x in ids_part.split(",")]
        final_hits = [h for h in pinecone_hits if h["insight_id"] in selected_ids]
        books = {}

        for hit in final_hits:
            book = hit["book"]

            if book not in books:
                books[book] = []

            books[book].append({
                "id": hit["insight_id"],
                "title": hit["title"],
                "category": hit["category"],
                "category_icon":hit["category_icon"],
                "description":hit["description"],
                "link": f"http://localhost:3000/insight/{hit['book'].replace(' ', '%20')}/{hit['category'].replace(' ', '%20')}/{hit['insight_id']}",
            })

        return {
            "answer": answer_part,
            "insights": books
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
