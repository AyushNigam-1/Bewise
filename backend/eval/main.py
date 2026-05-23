from ragas import evaluate

from .eval_config import get_evaluation_setup
from .eval_data import generate_evaluation_dataset


def main():
    # 1. Gather configured metrics
    metrics = get_evaluation_setup()

    # 2. Run the RAG pipeline to generate answers and context
    dataset = generate_evaluation_dataset()

    # 3. Trigger multi-metric Ragas Evaluation
    print("Running Ragas Evaluation across all 10 metrics...")
    results = evaluate(dataset=dataset, metrics=metrics)

    print("\n=== Evaluation Results ===")
    print(results)

    # 4. Export to CSV
    df = results.to_pandas()
    output_path = "ragas_evaluation_results.csv"
    df.to_csv(output_path, index=False)
    print(f"\nResults cleanly saved to {output_path}")


if __name__ == "__main__":
    main()
