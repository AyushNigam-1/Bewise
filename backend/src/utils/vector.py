import os
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer

# Load env
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX")

# Pinecone client
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(INDEX_NAME)

# Open source embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

def embed_and_upsert_insight(
    insight_id: int,
    book_name: str,
    category: str,
    title: str,
    description: str,
):
    text = f"{title}. {description}"

    embedding = model.encode(text).tolist()

    index.upsert([
        {
            "id": str(insight_id),
            "values": embedding,
            "metadata": {
                "insight_id": insight_id,
                "book": book_name,
                "category": category,
                "title": title,
                "description": description,
            }
        }
    ])

def search_insights(query: str, top_k: int = 5):
    # embed user query
    q_embedding = model.encode(query).tolist()

    res = index.query(
        vector=q_embedding,
        top_k=top_k,
        include_metadata=True
    )

    matches = []

    for m in res["matches"]:
        matches.append({
            "insight_id": int(m["id"]),
            "score": m["score"],
            "book": m["metadata"].get("book"),
            "category": m["metadata"].get("category"),
            "title": m["metadata"].get("title"),
            "description": m["metadata"].get("description"),
        })
    print("matches",matches)
    return matches
