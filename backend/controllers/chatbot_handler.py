import traceback
import logging
from typing import Optional, Dict, List, TypedDict, Any
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, START, END
from langchain_core.runnables import RunnableLambda

from core.database import connect_db
from services.vector import search_insights
from core.llm import llm

logger = logging.getLogger(__name__)

class RAGResponse(BaseModel):
    answer: str = Field(description="Detailed answer or summary based ONLY on provided context")
    # 🌟 FIX 2a: Added default_factory=list to make it easier for the LLM to return empty arrays safely
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
    
    raw_books = state.get("books_ids") or []
    raw_insights = state.get("insights_ids") or []
    
    book_names = [str(b) for b in raw_books]
    insight_ids = []
    insight_titles = []

    for item in raw_insights:
        if isinstance(item, int) or (isinstance(item, str) and item.isdigit()):
            insight_ids.append(int(item))
        else:
            insight_titles.append(str(item))

    combined_hits = {}
    all_text_names = list(set(book_names + insight_titles))

    if insight_ids or all_text_names:
        try:
            with connect_db() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT id, book_name, category_name, title, description, detailed_breakdown 
                        FROM insights 
                        WHERE id = ANY(%s) 
                           OR title = ANY(%s) 
                           OR book_name = ANY(%s)
                        LIMIT 15
                    """, (insight_ids, all_text_names, all_text_names))
                    
                    rows = cursor.fetchall()
                    for r in rows:
                        combined_hits[r[0]] = {
                            "insight_id": r[0],
                            "book": r[1],
                            "category": r[2],
                            "title": r[3],
                            "description": r[4],
                            "detailed_breakdown": r[5],
                            "category_icon": "📌",
                            "source": "explicit" # 🌟 We track that the user already has this card
                        }
        except Exception as e:
            logger.error(f"DB Fetch Error in RAG: {e}")

    pinecone_results = search_insights(
        query=message,
        book_names=book_names,
        insight_ids=insight_ids,
        insight_titles=insight_titles,
        top_k=5
    )

    for h in pinecone_results:
        i_id = h["insight_id"]
        if i_id not in combined_hits:
            h["source"] = "vector" # 🌟 We track that this is a NEW recommendation
            h["detailed_breakdown"] = h.get("description", "") 
            combined_hits[i_id] = h

    return {"pinecone_hits": list(combined_hits.values())}


def generate_node(state: RAGState):
    message = state["message"]
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

    # 🌟 FIX 2b: Wrap the invocation in a try/except block so conversational parsing errors NEVER crash the server
    try:
        parsed: RAGResponse = structured_llm.invoke([
            ("system", system_prompt),
            ("human", human_prompt)
        ])
    except Exception as e:
        logger.warning(f"LLM Parsing failed (likely conversational query): {e}")
        parsed = RAGResponse(
            answer="I am Wiser, your reading assistant! I'm doing great. How can I help you explore your books and insights today?",
            ids=[]
        )

    if not parsed.ids and not parsed.answer:
        return {
            "final_response": {
                "answer": "No relevant insight found to answer your question.",
                "insights": {}
            }
        }

    final_hits = [h for h in hits if h["insight_id"] in parsed.ids]
    books: Dict[str, List[dict]] = {}

    for hit in final_hits:
        # 🌟 FIX 1: If the user explicitly selected this card, DO NOT send it back to the UI!
        if hit.get("source") == "explicit":
            continue 

        book = hit["book"]
        if book not in books:
            books[book] = []

        safe_book = hit['book'].replace(' ', '%20')
        safe_cat = hit['category'].replace(' ', '%20')

        books[book].append({
            "id": hit["insight_id"],
            "title": hit["title"],
            "category": hit["category"],
            "category_icon": hit.get("category_icon", "📌"),
            "description": hit["description"],
            "link": f"/insight/{safe_book}/{safe_cat}/{hit['insight_id']}",
        })

    return {
        "final_response": {
            "answer": parsed.answer,
            "insights": books
        }
    }

workflow = StateGraph(RAGState)

workflow.add_node("retrieve", retrieve_node)
workflow.add_node("generate", generate_node)

workflow.add_edge(START, "retrieve")
workflow.add_edge("retrieve", "generate")
workflow.add_edge("generate", END)

rag_graph = workflow.compile()

def rag_entrypoint(input_data: dict):
    try:
        final_state = rag_graph.invoke(input_data)
        return final_state["final_response"]
    except Exception as e:
        logger.error(f"RAG agent failed: {e}")
        traceback.print_exc()
        raise Exception("RAG agent failed.")

rag_runnable = RunnableLambda(rag_entrypoint)