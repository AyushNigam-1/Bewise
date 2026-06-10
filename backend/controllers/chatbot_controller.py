import logging
import time
import traceback
from typing import Any, Dict, List, Optional, TypedDict
import sentry_sdk
from core.analytics import posthog
from core.llm import llm
from repositories.insight_repository import get_book_names_by_ids, get_explicit_insights
from langchain_core.runnables import RunnableLambda
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field
from services.vector import search_insights

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

    raw_book_ids = state.get("books_ids") or []
    insight_ids = state.get("insights_ids") or []

    combined_hits = {}
    explicit_db_hits = 0
    book_names = []

    try:
        # 1. Database Repository Calls
        book_names = get_book_names_by_ids(raw_book_ids)
        explicit_insights = get_explicit_insights(insight_ids, book_names)
        
        for insight in explicit_insights:
            combined_hits[insight["insight_id"]] = insight
            
        explicit_db_hits = len(explicit_insights)

    except Exception as e:
        sentry_sdk.capture_exception(e)
        logger.error(f"DB Fetch Error in RAG: {e}")

    # 2. Vector Repository Call
    pinecone_results = search_insights(
        query=message,
        book_names=book_names,
        insight_ids=insight_ids,
        insight_titles=[],
        top_k=5,
    )

    # 3. Merge Logic
    vector_hits = 0
    for h in pinecone_results:
        i_id = h["insight_id"]
        if i_id not in combined_hits:
            h["source"] = "vector"
            h["detailed_breakdown"] = h.get("description", "")
            combined_hits[i_id] = h
            vector_hits += 1

    # 4. Telemetry
    latency = time.time() - start_time
    posthog.capture(...) # (Keep your existing posthog code here)

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
