import os
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer, CrossEncoder
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX")

if not PINECONE_API_KEY or not INDEX_NAME:
    raise ValueError("Pinecone API key or Index name is missing in environment variables.")

# Initialize Pinecone Singleton
pc = Pinecone(api_key=PINECONE_API_KEY)
pinecone_index = pc.Index(INDEX_NAME)

# Initialize ML Models (Loaded once into memory at startup)
embedder = SentenceTransformer("all-MiniLM-L6-v2")
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")