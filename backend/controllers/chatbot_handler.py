import traceback
from typing import Optional, Dict, List
from fastapi import HTTPException
from services.vector import search_insights
from core.llm import chat, parser, RAGResponse

def ai_reply_logic(
    message: str, 
    session_id: str, 
    books_ids: Optional[List[str]] = None, 
    insights_ids: Optional[List[int]] = None
) -> Dict:
    try:
        # 1. Retrieve context from Pinecone
        pinecone_hits = search_insights(
            message, 
            books_ids, 
            insights_ids,
            top_k=5
        )
        
        # 2. Build context blocks
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
            {message}

            Candidate insights:
            {context}

            Rules:
            - Select ONLY insights that directly answer the question.
            - If nothing matches, return empty ids list [].
            - Do NOT hallucinate.

            Return structured JSON.
        """

        format_instructions = parser.get_format_instructions()

        # 3. Invoke LLM with memory
        result = chat.invoke(
            {
                "input": grounded_prompt,
                "format": format_instructions
            },
            config={"configurable": {"session_id": session_id}},
        )

        # 4. Parse the output
        parsed: RAGResponse = parser.parse(result.content)

        # 5. Handle empty/no-match states
        if not parsed.ids:
            return {
                "answer": parsed.answer or "I could not find any relevant insight for this question.",
                "insights": {}
            }

        # 6. Format successful response
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
        raise HTTPException(status_code=500, detail=str(e))