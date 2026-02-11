import fitz
import json
import re
import numpy as np
from markdown_it import MarkdownIt

# NEW Ollama import (no deprecation)
from langchain_ollama import OllamaEmbeddings


# -------------------------------
# Ollama Embeddings (nomic)
# -------------------------------

embeddings = OllamaEmbeddings(model="nomic-embed-text")


# -------------------------------
# PDF
# -------------------------------

def extract_text_from_pdf(pdf_path, chunk_size=3):
    doc = fitz.open(pdf_path)
    pages = [page.get_text() for page in doc][:40]

    return [
        "\n".join(pages[i:i + chunk_size])
        for i in range(0, len(pages), chunk_size)
    ]


# -------------------------------
# Markdown → JSON
# (renamed to match imports)
# -------------------------------

def markdown_to_json(markdown_text):
    md = MarkdownIt()
    tokens = md.parse(markdown_text)

    for token in tokens:
        if token.type == "fence":
            content = clean_json_string(token.content)

            try:
                return json.loads(content)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON: {e}")

    return None


def clean_json_string(json_string):
    json_string = json_string.replace("\t", " ")
    json_string = json_string.replace("\r", "")
    json_string = re.sub(r"[\x00-\x1F\x7F]", "", json_string)
    return json_string.strip()


# -------------------------------
# Cosine similarity (safe)
# -------------------------------

def cosine(a, b):
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return np.dot(a, b) / denom


# -------------------------------
# Remove similar insights
# Lightweight (no sklearn / torch)
# -------------------------------

def remove_similar_insights(insights, threshold=0.65):
    if not insights:
        return []

    vectors = embeddings.embed_documents(insights)

    kept_vectors = []
    kept_texts = []

    for i, vec in enumerate(vectors):
        duplicate = False

        for kvec in kept_vectors:
            if cosine(vec, kvec) > threshold:
                duplicate = True
                break

        if not duplicate:
            kept_vectors.append(vec)
            kept_texts.append(insights[i])

    return kept_texts
