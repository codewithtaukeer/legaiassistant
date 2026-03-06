import pandas as pd
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from rank_bm25 import BM25Okapi

data = pd.read_csv("data/legal_sections.csv")
documents = data["text"].tolist()

tokenized_docs = [doc.split(" ") for doc in documents]
bm25 = BM25Okapi(tokenized_docs)

model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = model.encode(documents)

dimension = embeddings.shape[1]
index = faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity

# Normalize embeddings
norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
normalized = embeddings / (norms + 1e-10)
index.add(np.array(normalized))


def search_legal_sections(query, top_k=3):

    # Semantic search
    query_embedding = model.encode([query])
    query_norm = query_embedding / (np.linalg.norm(query_embedding) + 1e-10)
    distances, indices = index.search(np.array(query_norm), top_k)
    semantic_results = {int(i): float(d) for i, d in zip(indices[0], distances[0])}

    # Keyword search
    tokenized_query = query.split(" ")
    bm25_scores = bm25.get_scores(tokenized_query)
    keyword_indices = np.argsort(bm25_scores)[::-1][:top_k]
    keyword_results = {int(i): float(bm25_scores[i]) for i in keyword_indices}

    # Combine — semantic score takes priority
    combined = {}
    for i, score in semantic_results.items():
        combined[i] = {"semantic_score": score, "keyword_score": keyword_results.get(i, 0.0)}
    for i, score in keyword_results.items():
        if i not in combined:
            combined[i] = {"semantic_score": 0.0, "keyword_score": score}

    results = []
    for i, scores in combined.items():
        relevance = round((scores["semantic_score"] * 0.7) + (scores["keyword_score"] * 0.3), 4)
        results.append({
            "act": str(data.iloc[i]["act"]),
            "section": int(data.iloc[i]["section"]),
            "title": str(data.iloc[i]["title"]),
            "text": str(data.iloc[i]["text"]),
            "relevance_score": relevance
        })

    # Sort by relevance
    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return results