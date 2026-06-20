import logging
from typing import Any, Dict, List, Optional, TypedDict
from core.llm import llm
from repositories.insight_repository import get_book_names_by_ids, get_explicit_insights
from langchain_core.runnables import RunnableLambda
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field
from services.vector import search_insights

logger = logging.getLogger(__name__)

class RAGResponse(BaseModel):
    answer: str = Field(description="Detailed answer or summary based ONLY on provided context")
    ids: List[int] = Field(default_factory=list, description="Relevant insight ids used for the answer. Empty if none.")

class RAGState(TypedDict):
    message: str
    session_id: str
    books_ids: Optional[List[Any]]
    insights_ids: Optional[List[Any]]
    pinecone_hits: List[dict]
    final_response: dict


def retrieve_node(state: RAGState):
    message = state["message"]
    session_id = state.get("session_id", "anonymous")

    # 2. Bundle metadata locally
    log_context = {
        "user_id": session_id,
        "action": "rag_retrieval",
        "message_length": len(message)
    }

    raw_book_ids = state.get("books_ids") or []
    insight_ids = state.get("insights_ids") or []

    combined_hits = {}
    explicit_db_hits = 0
    book_names = []

    try:
        book_names = get_book_names_by_ids(raw_book_ids)
        explicit_insights = get_explicit_insights(insight_ids, book_names)
        
        for insight in explicit_insights:
            combined_hits[insight["insight_id"]] = insight
            
        explicit_db_hits = len(explicit_insights)

    except Exception as e:
        # 🌟 CLEAN FALLBACK: Sentry gets the trace, but the node doesn't crash!
        log_context["db_fallback_triggered"] = True
        logger.exception("DB Fetch failed, falling back exclusively to Vector", extra=log_context)

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

    log_context.update({
        "explicit_db_hits": explicit_db_hits,
        "vector_hits": vector_hits,
        "total_context_items": len(combined_hits)
    })
    logger.info("RAG retrieval completed", extra=log_context)

    return {"pinecone_hits": list(combined_hits.values())}


def generate_node(state: RAGState):
    message = state["message"]
    session_id = state.get("session_id", "anonymous")
    hits = state["pinecone_hits"]

    log_context = {
        "user_id": session_id,
        "action": "rag_generation",
        "hits_received": len(hits)
    }

    blocks = []
    for h in hits:
        content = h.get("detailed_breakdown", h.get("description", ""))
        blocks.append(
            f"Id: {h['insight_id']}\nBook: {h['book']}\nCategory: {h['category']}\nTitle: {h['title']}\nContent: {content}"
        )

    context = "\n---\n".join(blocks)
    system_prompt = "You are Wiser, an intelligent AI reading assistant. Answer thoroughly using ONLY the provided insights..."
    human_prompt = f"User question: {message}\n\nCandidate insights:\n{context}"

    structured_llm = llm.with_structured_output(RAGResponse)

    try:
        parsed: RAGResponse = structured_llm.invoke([("system", system_prompt), ("human", human_prompt)])
        
        log_context.update({
            "llm_success": True, 
            "cited_sources_count": len(parsed.ids)
        })
        logger.info("RAG generation successful", extra=log_context)
        
    except Exception as e:
        log_context.update({"llm_success": False, "fallback_triggered": True})
        logger.exception("LLM Parsing failed, reverting to conversational fallback", extra=log_context)
        
        parsed = RAGResponse(
            answer="I am Wiser, your reading assistant! I'm doing great. How can I help you explore your books and insights today?",
            ids=[],
        )

    if not parsed.ids and not parsed.answer:
        return {"final_response": {"answer": "No relevant insight found to answer your question.", "insights": {}}}

    final_hits = [h for h in hits if h["insight_id"] in parsed.ids]
    books: Dict[str, List[dict]] = {}

    for hit in final_hits:
        if hit.get("source") == "explicit": continue

        book = hit["book"]
        if book not in books: books[book] = []

        safe_book = hit["book"].replace(" ", "%20")
        safe_cat = hit["category"].replace(" ", "%20")

        books[book].append({
            "id": hit["insight_id"],
            "title": hit["title"],
            "category": hit["category"],
            "category_icon": hit.get("category_icon", "📌"),
            "description": hit["description"],
            "link": f"/insight/{safe_book}/{safe_cat}/{hit['insight_id']}",
        })

    return {"final_response": {"answer": parsed.answer, "insights": books}}


workflow = StateGraph(RAGState)
workflow.add_node("retrieve", retrieve_node)
workflow.add_node("generate", generate_node)
workflow.add_edge(START, "retrieve")
workflow.add_edge("retrieve", "generate")
workflow.add_edge("generate", END)

rag_graph = workflow.compile()


def rag_entrypoint(input_data: dict):
    session_id = input_data.get("session_id", "anonymous")
    log_context = {
        "user_id": session_id,
        "action": "rag_interaction",
        "query_length": len(input_data.get("message", ""))
    }

    try:
        final_state = rag_graph.invoke(input_data)
        logger.info("RAG interaction completed", extra=log_context)
        return final_state["final_response"]
    except Exception as e:
        logger.exception("RAG graph execution failed natively", extra=log_context)
        raise e

rag_runnable = RunnableLambda(rag_entrypoint)