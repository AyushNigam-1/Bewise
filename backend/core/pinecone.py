import os
import warnings
from dotenv import load_dotenv

load_dotenv()

os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
warnings.filterwarnings("ignore", category=FutureWarning)

from pinecone import Pinecone
from sentence_transformers import SentenceTransformer, CrossEncoder

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX")

if not PINECONE_API_KEY or not INDEX_NAME:
    raise ValueError("Pinecone API key or Index name is missing in environment variables.")

pc = Pinecone(api_key=PINECONE_API_KEY)
pinecone_index = pc.Index(INDEX_NAME)

embedder = SentenceTransformer("all-MiniLM-L6-v2")
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")