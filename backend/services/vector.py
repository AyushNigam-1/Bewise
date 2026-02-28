from core.pinecone import pinecone_index as index, embedder, reranker

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


def search_insights(query: str, book_ids: list[str] = None, insight_ids: list[int] = None, top_k: int = 5):
    # 1. Embed query
    q_embedding = embedder.encode(query).tolist()

    # 2. Build metadata filter
    pinecone_filter = {}

    if book_ids and len(book_ids) > 0:
            pinecone_filter["book"] = {"$in": book_ids}

    # FILTER BY INSIGHT ID (Integer)
    if insight_ids and len(insight_ids) > 0:
        pinecone_filter["insight_id"] = {"$in": insight_ids}

    print(f"Searching with filter: {pinecone_filter}")

    # 3. Pinecone search
    pinecone_res = index.query(
        vector=q_embedding,
        top_k=20, # Fetch more for reranking
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
            "insight_id": int(m["id"]), # Ensure this matches your ID format
            "rerank_score": float(score),
            "book": m["metadata"].get("book"),
            "category": m["metadata"].get("category"),
            "category_icon": m["metadata"].get("category_icon"),
            "title": m["metadata"].get("title"),
            "description": m["metadata"].get("description"),
        })

    # 6. Sort and return
    reranked.sort(key=lambda x: x["rerank_score"], reverse=True)
    return reranked[:top_k]


def recommend_for_user(
    bookmarked_insight_ids: list[int],
    top_k: int = 10,
):
    """
    Recommend new insights based on user's bookmarked insights
    """

    if not bookmarked_insight_ids:
        return []

    # 1. Fetch vectors for user's bookmarked insights
    fetch_ids = [str(i) for i in bookmarked_insight_ids]

    fetched = index.fetch(ids=fetch_ids)

    vectors = []

    for v in fetched["vectors"].values():
        vectors.append(v["values"])

    if not vectors:
        return []

    # 2. Build USER VECTOR (average)
    user_vector = [
        sum(col) / len(col)
        for col in zip(*vectors)
    ]

    # 3. Query Pinecone using user vector
    res = index.query(
        vector=user_vector,
        top_k=30,
        include_metadata=True
    )

    matches = res["matches"]

    # 4. Remove already bookmarked
    matches = [
        m for m in matches
        if int(m["id"]) not in bookmarked_insight_ids
    ]

    if not matches:
        return []

    # 5. Prepare reranker input
    rerank_pairs = [
        (
            "user interest",
            f'{m["metadata"].get("title","")} {m["metadata"].get("description","")}'
        )
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
            "category_icon": m["metadata"].get("category_icon"),
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
    """
    Recommend next insights based on current reading session
    + optional user bookmarks
    """

    # 1. Build session query from current insight
    session_text = f"{current_insight_title}. {current_insight_description}"

    session_embedding = embedder.encode(session_text).tolist()

    pinecone_filter = {}

    # Optional boost: user's bookmarked insights
    if user_bookmarked_ids and len(user_bookmarked_ids) > 0:
        pinecone_filter["insight_id"] = {"$nin": user_bookmarked_ids}

    if current_insight_id:
        pinecone_filter["insight_id"] = {
            "$nin": [current_insight_id]
        }
        
    # 2. Vector search
    res = index.query(
        vector=session_embedding,
        top_k=20,  # grab more for reranking
        include_metadata=True,
        filter=pinecone_filter if pinecone_filter else None
    )

    matches = res["matches"]

    if not matches:
        return []

    # 3. Prepare rerank pairs
    rerank_pairs = [
        (
            session_text,
            f'{m["metadata"].get("title","")} {m["metadata"].get("description","")}'
        )
        for m in matches
    ]

    # 4. Cross-encoder rerank
    scores = reranker.predict(rerank_pairs)

    reranked = []

    for m, score in zip(matches, scores):
        reranked.append({
            "insight_id": int(m["id"]),
            "score": float(score),
            "book": m["metadata"].get("book"),
            "category": m["metadata"].get("category"),
            "category_icon": m["metadata"].get("category_icon"),
            "title": m["metadata"].get("title"),
            "description": m["metadata"].get("description"),
        })

    # 5. Sort + return best
    reranked.sort(key=lambda x: x["score"], reverse=True)

    return reranked[:top_k]