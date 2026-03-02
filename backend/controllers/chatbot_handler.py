import traceback
from typing import Optional, Dict, List, TypedDict
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, START, END
from langchain_core.runnables import RunnableLambda
from services.vector import search_insights
from core.llm import llm

class RAGResponse(BaseModel):
    answer: str = Field(description="Short answer based ONLY on provided context")
    ids: List[int] = Field(description="Relevant insight ids. Empty if none.")

class RAGState(TypedDict):
    message: str
    session_id: str
    books_ids: Optional[List[str]]
    insights_ids: Optional[List[int]]
    pinecone_hits: List[dict]
    final_response: dict

def retrieve_node(state: RAGState):
    hits = search_insights(
        state["message"],
        state.get("books_ids"),
        state.get("insights_ids"),
        top_k=5
    )
    return {"pinecone_hits": hits}


def generate_node(state: RAGState):
    message = state["message"]
    hits = state["pinecone_hits"]

    blocks = [
        f"Id: {h['insight_id']}\nBook: {h['book']}\nCategory: {h['category']}\nTitle: {h['title']}\nDescription: {h['description']}"
        for h in hits
    ]

    context = "\n---\n".join(blocks)

    system_prompt = "You are Bookist AI. Answer ONLY using provided insights. Do NOT hallucinate."

    human_prompt = f"""
    User question: {message}

    Candidate insights:
    {context}

    Rules:
    - Select ONLY insights that directly answer the question.
    - If nothing matches, return an empty ids list [].
    """

    structured_llm = llm.with_structured_output(RAGResponse)

    parsed: RAGResponse = structured_llm.invoke([
        ("system", system_prompt),
        ("human", human_prompt)
    ])

    if not parsed.ids:
        return {
            "final_response": {
                "answer": parsed.answer or "No relevant insight found.",
                "insights": {}
            }
        }

    final_hits = [h for h in hits if h["insight_id"] in parsed.ids]

    books: Dict[str, List[dict]] = {}

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
            "link": f"http://localhost:3000/insight/"
                    f"{hit['book'].replace(' ', '%20')}/"
                    f"{hit['category'].replace(' ', '%20')}/"
                    f"{hit['insight_id']}",
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
        traceback.print_exc()
        raise Exception("RAG agent failed.")


rag_runnable = RunnableLambda(rag_entrypoint)