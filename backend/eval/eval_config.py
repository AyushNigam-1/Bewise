import os
import warnings

from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings as LCHuggingFaceEmbeddings
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.llms import LangchainLLMWrapper
from ragas.metrics import (
    AnswerRelevancy,
    AnswerSimilarity,
    AspectCritic,
    ContextEntityRecall,
    ContextPrecision,
    ContextRecall,
    FactualCorrectness,
    Faithfulness,
    NoiseSensitivity,
)

# Force offline mode for Transformers and silence warnings
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
warnings.filterwarnings("ignore")


def get_evaluation_setup():
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY environment variable is missing.")

    # Initialize wrapped LLM (skips Instructor mode constraints)
    ragas_llm = LangchainLLMWrapper(
        ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=groq_api_key,
            temperature=0,
        )
    )

    print("Loading local SentenceTransformer model...")
    eval_embeddings = LangchainEmbeddingsWrapper(
        LCHuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    )

    metrics = [
        # --- Retrieval Metrics ---
        Faithfulness(llm=ragas_llm),
        ContextPrecision(llm=ragas_llm),
        ContextRecall(llm=ragas_llm),
        ContextEntityRecall(llm=ragas_llm),
        NoiseSensitivity(llm=ragas_llm),
        # --- Generation Metrics ---
        AnswerRelevancy(llm=ragas_llm, embeddings=eval_embeddings),
        AnswerSimilarity(embeddings=eval_embeddings),
        FactualCorrectness(llm=ragas_llm),
        # --- Custom Aspect Critics ---
        AspectCritic(
            name="professional_tone",
            definition="Does the response maintain a professional and informative tone without casual language or filler phrases?",
            llm=ragas_llm,
        ),
        AspectCritic(
            name="no_hallucination_flags",
            definition="Does the response avoid making claims that are clearly not supported by common knowledge or the question context?",
            llm=ragas_llm,
        ),
    ]

    return metrics
