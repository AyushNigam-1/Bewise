import numpy as np
from langchain_ollama import OllamaEmbeddings

embeddings = OllamaEmbeddings(model="nomic-embed-text")

def cosine(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


def remove_duplicate_steps(steps, threshold=0.75):
    if not steps:
        return []

    vectors = embeddings.embed_documents(steps)

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

    return kept_texts
