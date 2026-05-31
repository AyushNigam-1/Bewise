import logging
import time
import traceback
from typing import Any, Dict, List, Optional, TypedDict

import sentry_sdk
from core.analytics import posthog
from core.database import engine
from core.llm import llm
from core.models import Book, Insight
from langchain_core.runnables import RunnableLambda
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field
from services.vector import search_insights
from sqlmodel import Session, or_, select

logger = logging.getLogger(__name__)


class RAGResponse(BaseModel):
    answer: str = Field(
        description="Detailed answer or summary based ONLY on provided context"
    )
    ids: List[int] = Field(
        default_factory=list,
        description="Relevant insight ids used for the answer. Empty if none.",
    )


class RAGState(TypedDict):
    message: str
    session_id: str
    books_ids: Optional[List[Any]]
    insights_ids: Optional[List[Any]]
    pinecone_hits: List[dict]
    final_response: dict


def retrieve_node(state: RAGState):
    start_time = time.time()
    message = state["message"]
    session_id = state.get("session_id", "anonymous")

    # Strictly expecting lists of integers now
    raw_book_ids = state.get("books_ids") or []
    insight_ids = state.get("insights_ids") or []

    book_names = []
    combined_hits = {}
    explicit_db_hits = 0

    try:
        with Session(engine) as db:
            # 1. Resolve integer Book IDs to string titles for Pinecone and Insight filtering
            if raw_book_ids:
                books = db.exec(select(Book).where(Book.id.in_(raw_book_ids))).all()
                book_names = [b.title for b in books]

            # 2. Fetch explicit insights based on integer IDs or resolved book names
            conditions = []
            if insight_ids:
                conditions.append(Insight.id.in_(insight_ids))
            if book_names:
                conditions.append(Insight.book_name.in_(book_names))

            if conditions:
                statement = select(Insight).where(or_(*conditions)).limit(15)
                rows = db.exec(statement).all()

                for r in rows:
                    combined_hits[r.id] = {
                        "insight_id": r.id,
                        "book": r.book_name,
                        "category": r.category_name,
                        "title": r.title,
                        "description": r.description,
                        "detailed_breakdown": r.detailed_breakdown,
                        "category_icon": "📌",
                        "source": "explicit",
                    }
                explicit_db_hits = len(rows)

    except Exception as e:
        sentry_sdk.capture_exception(e)
        logger.error(f"DB Fetch Error in RAG: {e}")

    # Passed insight_titles=[] to prevent breaking your existing vector service signature
    pinecone_results = search_insights(
        query=message,
        book_names=book_names,
        insight_ids=insight_ids,
        insight_titles=[],
        top_k=5,
    )

    vector_hits = 0
    for h in pinecone_results:
        i_id = h["insight_id"]
        if i_id not in combined_hits:
            h["source"] = "vector"
            h["detailed_breakdown"] = h.get("description", "")
            combined_hits[i_id] = h
            vector_hits += 1

    latency = time.time() - start_time
    posthog.capture(
        distinct_id=session_id,
        event="rag_retrieval_completed",
        properties={
            "explicit_db_hits": explicit_db_hits,
            "vector_hits": vector_hits,
            "total_context_items": len(combined_hits),
            "latency_seconds": round(latency, 2),
        },
    )

    return {"pinecone_hits": list(combined_hits.values())}


def generate_node(state: RAGState):
    start_time = time.time()
    message = state["message"]
    session_id = state.get("session_id", "anonymous")
    hits = state["pinecone_hits"]

    blocks = []
    for h in hits:
        content = h.get("detailed_breakdown", h.get("description", ""))
        blocks.append(
            f"Id: {h['insight_id']}\nBook: {h['book']}\nCategory: {h['category']}\nTitle: {h['title']}\nContent: {content}"
        )

    context = "\n---\n".join(blocks)

    system_prompt = """
    You are Wiser, an intelligent AI reading assistant.
    You have been provided with specific context (Candidate insights) explicitly selected by the user.

    CRITICAL RULES:
    1. If the user asks you to "explain this", "summarize", or "tell me about it", they are directly asking you to explain the Candidate insights provided below.
    2. Answer thoroughly using ONLY the provided insights.
    3. Do NOT say you lack information if Candidate insights are present. Just explain them.
    4. If the user asks a casual greeting (e.g. "how are you", "kese ho"), respond politely without using any insights.
    5. Do NOT hallucinate external information.
    """

    human_prompt = f"""
    User question: {message}

    Candidate insights:
    {context}

    Task:
    1. Provide a detailed answer, summary, or recommendation.
    2. Extract the specific insight 'Id's you used to form your answer.
    If no relevant insights match and you absolutely cannot answer, return an empty list for ids.
    """

    structured_llm = llm.with_structured_output(RAGResponse)

    llm_success = True
    try:
        parsed: RAGResponse = structured_llm.invoke(
            [("system", system_prompt), ("human", human_prompt)]
        )
    except Exception as e:
        llm_success = False
        posthog.capture(
            distinct_id=session_id,
            event="rag_llm_parsing_failed",
            properties={"error": str(e)},
        )
        logger.warning(f"LLM Parsing failed (likely conversational query): {e}")
        parsed = RAGResponse(
            answer="I am Wiser, your reading assistant! I'm doing great. How can I help you explore your books and insights today?",
            ids=[],
        )

    latency = time.time() - start_time
    posthog.capture(
        distinct_id=session_id,
        event="rag_generation_completed",
        properties={
            "llm_success": llm_success,
            "cited_sources_count": len(parsed.ids),
            "latency_seconds": round(latency, 2),
        },
    )

    if not parsed.ids and not parsed.answer:
        return {
            "final_response": {
                "answer": "No relevant insight found to answer your question.",
                "insights": {},
            }
        }

    final_hits = [h for h in hits if h["insight_id"] in parsed.ids]
    books: Dict[str, List[dict]] = {}

    for hit in final_hits:
        if hit.get("source") == "explicit":
            continue

        book = hit["book"]
        if book not in books:
            books[book] = []

        safe_book = hit["book"].replace(" ", "%20")
        safe_cat = hit["category"].replace(" ", "%20")

        books[book].append(
            {
                "id": hit["insight_id"],
                "title": hit["title"],
                "category": hit["category"],
                "category_icon": hit.get("category_icon", "📌"),
                "description": hit["description"],
                "link": f"/insight/{safe_book}/{safe_cat}/{hit['insight_id']}",
            }
        )

    return {"final_response": {"answer": parsed.answer, "insights": books}}


workflow = StateGraph(RAGState)

workflow.add_node("retrieve", retrieve_node)
workflow.add_node("generate", generate_node)

workflow.add_edge(START, "retrieve")
workflow.add_edge("retrieve", "generate")
workflow.add_edge("generate", END)

rag_graph = workflow.compile()


def rag_entrypoint(input_data: dict):
    start_time = time.time()
    session_id = input_data.get("session_id", "anonymous")

    posthog.capture(
        distinct_id=session_id,
        event="rag_interaction_started",
        properties={"query_length": len(input_data.get("message", ""))},
    )

    try:
        final_state = rag_graph.invoke(input_data)

        total_latency = time.time() - start_time
        posthog.capture(
            distinct_id=session_id,
            event="rag_interaction_success",
            properties={"total_latency_seconds": round(total_latency, 2)},
        )

        return final_state["final_response"]

    except Exception as e:
        total_latency = time.time() - start_time

        sentry_sdk.capture_exception(e)

        posthog.capture(
            distinct_id=session_id,
            event="rag_interaction_failed",
            properties={
                "error_message": str(e),
                "failed_after_seconds": round(total_latency, 2),
            },
        )

        logger.error(f"RAG agent failed: {e}")
        traceback.print_exc()
        raise Exception("RAG agent failed.")


rag_runnable = RunnableLambda(rag_entrypoint)
