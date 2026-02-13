import os
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer, CrossEncoder

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX")

pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(INDEX_NAME)

embedder = SentenceTransformer("all-MiniLM-L6-v2")

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

def embed_and_upsert_insight(
    insight_id: int,
    book_name: str,
    category: str,
    category_icon: str,
    title: str,
    description: str,
):

    text = f"""
        Book: {book_name}
        Category: {category}
        Insight: {title}
        Explanation: {description}
        """

    embedding = embedder.encode(text).tolist()

    index.upsert([
        {
            "id": str(insight_id),
            "values": embedding,
            "metadata": {
                "insight_id": insight_id,
                "book": book_name,
                "category": category,
                "category_icon": category_icon,
                "title": title,
                "description": description,
                "text": text,
            }
        }
    ])

def search_insights(query: str, book: str | None = None, top_k: int = 5):

    # 1. Embed query
    q_embedding = embedder.encode(query).tolist()

    # 2. Build optional metadata filter
    pinecone_filter = {}

    if book:
        pinecone_filter["book"] = {"$eq": book}

    # 3. Pinecone search (get more candidates for reranking)
    pinecone_res = index.query(
        vector=q_embedding,
        top_k=20,
        include_metadata=True,
        filter=pinecone_filter if pinecone_filter else None
    )

    matches = pinecone_res["matches"]

    if not matches:
        return []

    # 4. Prepare rerank pairs
    rerank_pairs = [
        (query, f'{m["metadata"].get("title","")} {m["metadata"].get("description","")}')
        for m in matches
    ]

    # 5. Rerank
    scores = reranker.predict(rerank_pairs)

    reranked = []

    for m, score in zip(matches, scores):
        reranked.append({
            "insight_id": int(m["id"]),
            "rerank_score": float(score),
            "book": m["metadata"].get("book"),
            "category": m["metadata"].get("category"),
            "category_icon": m["metadata"].get("category_icon"),
            "title": m["metadata"].get("title"),
            "description": m["metadata"].get("description"),
        })

    # 6. Sort by rerank score
    reranked.sort(key=lambda x: x["rerank_score"], reverse=True)

    # 7. Return final top_k
    final = reranked[:top_k]

    print("RERANKED RESULTS:", final)

    return final

