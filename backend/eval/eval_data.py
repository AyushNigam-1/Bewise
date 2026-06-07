from backend.controllers.chatbot_controller import rag_graph
from datasets import Dataset

# Your test cases defined centrally
TEST_CASES = [
    {
        "question": "What are the key habits of successful people?",
        "ground_truth": "Successful people focus on building systems rather than just setting goals, and they make small 1% improvements daily.",
    },
    {
        "question": "Explain how compounding applies to daily habits.",
        "ground_truth": "Compounding applies to habits because small, consistent daily actions accumulate over time to produce massive results.",
    },
]


def generate_evaluation_dataset():
    data_samples = {"question": [], "answer": [], "contexts": [], "ground_truth": []}

    print("Running LangGraph pipeline over test queries...")
    for case in TEST_CASES:
        question = case["question"]
        gt = case["ground_truth"]

        # Invoke your production graph state
        state_input = {"message": question, "session_id": "eval-session"}
        final_state = rag_graph.invoke(state_input)

        generated_answer = final_state["final_response"]["answer"]
        hits = final_state.get("pinecone_hits", [])
        contexts = [
            hit.get("detailed_breakdown", hit.get("description", "")) for hit in hits
        ]

        # Structure dataset rows
        data_samples["question"].append(question)
        data_samples["answer"].append(generated_answer)
        data_samples["contexts"].append(contexts)
        data_samples["ground_truth"].append(gt)

    return Dataset.from_dict(data_samples)
