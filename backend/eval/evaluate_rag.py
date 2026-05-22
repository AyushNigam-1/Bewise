import os
import asyncio
from ragas.metrics.collections import Faithfulness, FactualCorrectness, ContextRecall
from ragas.llms import llm_factory
from openai import OpenAI
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from ragas.embeddings import LangchainEmbeddingsWrapper
from controllers.chatbot_handler import rag_graph

from openai import AsyncOpenAI

groq_client = AsyncOpenAI(
    api_key=os.environ.get("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

evaluator_llm = llm_factory(
    model="llama-3.1-8b-instant",
    client=groq_client
)

evaluator_llm = llm_factory(
    model="llama-3.1-8b-instant",
    client=groq_client
)

fast_embeddings = FastEmbedEmbeddings(
    model_name="BAAI/bge-small-en-v1.5",
    cache_dir="./model_cache"
)
evaluator_embeddings = LangchainEmbeddingsWrapper(fast_embeddings)

metrics = [
    Faithfulness(llm=evaluator_llm),
    ContextRecall(llm=evaluator_llm),
    FactualCorrectness(llm=evaluator_llm),
]

test_cases = [
    {
        "query": "What are the core ideas of Atomic Habits?",
        "reference": "Atomic Habits focuses on building tiny daily habits, understanding the plateau of latent potential, and forming identity-based habits."
    },
    {
        "query": "Who wrote The Almanack of Naval Ravikant?",
        "reference": "Eric Jorgenson compiled and wrote The Almanack of Naval Ravikant."
    }
]

async def run_eval():
    rows = []

    for case in test_cases:
        query = case["query"]

        state = rag_graph.invoke({
            "message": query,
            "session_id": "eval_session"
        })

        response_text = state["final_response"]["answer"]
        raw_hits = state.get("pinecone_hits", [])
        contexts = [
            hit.get("detailed_breakdown", hit.get("description", ""))
            for hit in raw_hits
        ]

        faithfulness_metric = Faithfulness(llm=evaluator_llm)
        factual_metric = FactualCorrectness(llm=evaluator_llm)
        context_recall_metric = ContextRecall(llm=evaluator_llm)

        faithfulness_result = await faithfulness_metric.ascore(
    user_input=query,
    response=response_text,
    retrieved_contexts=contexts,
        )

        factual_result = await factual_metric.ascore(
            response=response_text,
            reference=case["reference"],
        )

        context_recall_result = await context_recall_metric.ascore(
            user_input=query,
            retrieved_contexts=contexts,
            reference=case["reference"],
        )

        rows.append({
            "user_input": query,
            "response": response_text,
            "reference": case["reference"],
            "faithfulness": faithfulness_result.value,
            "factual_correctness": factual_result.value,
            "context_recall": context_recall_result.value,
        })

    return rows

results = asyncio.run(run_eval())

print("\n=== Evaluation Results ===")
for row in results:
    print(row)