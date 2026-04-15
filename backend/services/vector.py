from core.pinecone import pinecone_index as index, embedder, reranker
import hashlib
import json
import logging
from core.redis import redis_client

logger = logging.getLogger(__name__)

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


def search_insights(
    query: str, 
    book_names: list[str] = None, 
    insight_ids: list[int] = None, 
    insight_titles: list[str] = None, 
    top_k: int = 5
):
    cache_key = "vector:" + hashlib.md5(
        f"{query}-{book_names}-{insight_ids}-{insight_titles}".encode()
    ).hexdigest()

    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception as e:
        logger.warning(f"Redis cache error, falling back to Pinecone: {e}")
    
    q_embedding = embedder.encode(query).tolist()

    pinecone_filter = {}

    if book_names and len(book_names) > 0:
        pinecone_filter["book"] = {"$in": book_names}

    if insight_ids and len(insight_ids) > 0:
        pinecone_filter["insight_id"] = {"$in": insight_ids}

    if insight_titles and len(insight_titles) > 0:
        pinecone_filter["title"] = {"$in": insight_titles}

    logger.info(f"Searching Pinecone with filter: {pinecone_filter}")

    pinecone_res = index.query(
        vector=q_embedding,
        top_k=20, 
        include_metadata=True,
        filter=pinecone_filter if pinecone_filter else None
    )

    matches = pinecone_res.get("matches", [])
    if not matches:
        return []

    rerank_pairs = [
        (query, f'{m["metadata"].get("title","")} {m["metadata"].get("description","")}')
        for m in matches
    ]

    scores = reranker.predict(rerank_pairs)

    reranked = []
    for m, score in zip(matches, scores):
        reranked.append({
            "insight_id": int(m["id"]),
            "rerank_score": float(score),
            "book": m["metadata"].get("book"),
            "category": m["metadata"].get("category"),
            "category_icon": m["metadata"].get("category_icon", "📌"),
            "title": m["metadata"].get("title"),
            "description": m["metadata"].get("description"),
        })

    reranked.sort(key=lambda x: x["rerank_score"], reverse=True)
    final_results = reranked[:top_k]

    try:
        redis_client.setex(cache_key, 3600, json.dumps(final_results)) # 1 hour cache
    except Exception as e:
        logger.warning(f"Redis set error: {e}")

    return final_results


def recommend_for_user(bookmarked_insight_ids: list[int], top_k: int = 10):
    if not bookmarked_insight_ids:
        return []

    fetch_ids = [str(i) for i in bookmarked_insight_ids]
    fetched = index.fetch(ids=fetch_ids)
    
    vectors = [v["values"] for v in fetched.get("vectors", {}).values()]
    if not vectors:
        return []

    user_vector = [sum(col) / len(col) for col in zip(*vectors)]

    res = index.query(
        vector=user_vector,
        top_k=30,
        include_metadata=True
    )

    matches = [m for m in res.get("matches", []) if int(m["id"]) not in bookmarked_insight_ids]
    if not matches:
        return []

    rerank_pairs = [
        ("user interest", f'{m["metadata"].get("title","")} {m["metadata"].get("description","")}')
        for m in matches
    ]

    scores = reranker.predict(rerank_pairs)

    reranked = []
    for m, score in zip(matches, scores):
        reranked.append({
            "insight_id": int(m["id"]),
            "rerank_score": float(score),
            "book": m["metadata"].get("book"),
            "category": m["metadata"].get("category"),
            "category_icon": m["metadata"].get("category_icon", "📌"),
            "title": m["metadata"].get("title"),
            "description": m["metadata"].get("description"),
        })

    reranked.sort(key=lambda x: x["rerank_score"], reverse=True)
    return reranked[:top_k]


def recommend_next_insights(
    current_insight_title: str,
    current_insight_description: str,
    user_bookmarked_ids: list[int] = None,
    current_insight_id: int = None,
    top_k: int = 3,
):
    session_text = f"{current_insight_title}. {current_insight_description}"
    session_embedding = embedder.encode(session_text).tolist()

    pinecone_filter = {}
    exclusions = []

    if user_bookmarked_ids:
        exclusions.extend(user_bookmarked_ids)
    if current_insight_id:
        exclusions.append(current_insight_id)
        
    if exclusions:
        pinecone_filter["insight_id"] = {"$nin": list(set(exclusions))}

    res = index.query(
        vector=session_embedding,
        top_k=20,
        include_metadata=True,
        filter=pinecone_filter if pinecone_filter else None
    )

    matches = res.get("matches", [])
    if not matches:
        return []

    rerank_pairs = [
        (session_text, f'{m["metadata"].get("title","")} {m["metadata"].get("description","")}')
        for m in matches
    ]

    scores = reranker.predict(rerank_pairs)

    reranked = []
    for m, score in zip(matches, scores):
        reranked.append({
            "insight_id": int(m["id"]),
            "score": float(score),
            "book": m["metadata"].get("book"),
            "category": m["metadata"].get("category"),
            "category_icon": m["metadata"].get("category_icon", "📌"),
            "title": m["metadata"].get("title"),
            "description": m["metadata"].get("description"),
        })

    reranked.sort(key=lambda x: x["score"], reverse=True)
    return reranked[:top_k]