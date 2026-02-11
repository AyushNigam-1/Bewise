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

            You MUST answer ONLY using the insights below.

            If the answer is not present reply EXACTLY:
            I don't find this in the uploaded books.

            CRITICAL:
            - Book and Category must be NORMAL text.
            - ONLY encode Book/Category inside Link.
            - Every insight MUST include Id.
            - NEVER omit Id.
            - NEVER invent Id.

            OUTPUT STRICT MARKDOWN:

            ## Insights

            For each insight:

            - **Id:** <number>
            - **Title:** <title>
            - **Book:** <normal text>
            - **Category:** <normal text>
            - **Link:** http://localhost:3000/insight/<URL_ENCODED_BOOK>/<URL_ENCODED_CATEGORY>/<Id>
            - **Explanation:** <short explanation>

            Rules:
            - Use bullet points.
            - Keep structure.
            - No paragraphs.
            - No extra commentary.

            User question:
            {user_query}

            INSIGHTS:
            {context_text}

            Follow format EXACTLY.
            """

        # 4. Groq with memory
        result = chat.invoke(
            {"input": grounded_prompt},
            config={"configurable": {"session_id": payload.session_id}},
        )

        return {
            "mode": "rag",
            "ai": result.content,
            "sources": pinecone_hits
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
