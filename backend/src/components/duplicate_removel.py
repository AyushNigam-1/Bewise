import numpy as np
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

def cosine(a, b):
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return np.dot(a, b) / (norm_a * norm_b)


def remove_duplicate_steps(steps, threshold=0.75):
    if not steps:
        return []

    threshold = float(threshold)

    print(f"--- [DEDUPLICATION] Embedding {len(steps)} steps natively... ---", flush=True)
    
    texts_to_embed = []
    for step in steps:
        if isinstance(step, dict):
            step_text = str(step.get("step", "")) + " " + str(step.get("description", ""))
            texts_to_embed.append(step_text)
        else:
            texts_to_embed.append(str(step))

    vectors = model.encode(texts_to_embed)

    kept_vectors = []
    kept_texts = []

    for i, vec in enumerate(vectors):
        is_dup = False

        for kv in kept_vectors:
            if cosine(vec, kv) > threshold:
                is_dup = True
                break

        if not is_dup:
            kept_vectors.append(vec)
            kept_texts.append(steps[i]) 

    print(f"--- [DEDUPLICATION] Done. Kept {len(kept_texts)} unique steps out of {len(steps)}. ---", flush=True)
    return kept_texts