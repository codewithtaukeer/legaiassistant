import pandas as pd
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from rank_bm25 import BM25Okapi

# Load procedures dataset
data = pd.read_csv("data/govt_procedures.csv")

# Combine fields for better search
data["combined"] = (
    data["process"] + " " +
    data["category"] + " " +
    data["step"] + " " +
    data["details"].fillna("") + " " +
    data["documents_required"].fillna("")
)

documents = data["combined"].tolist()

# BM25
tokenized_docs = [doc.lower().split() for doc in documents]
bm25 = BM25Okapi(tokenized_docs)

# Embeddings
model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = model.encode(documents)

# FAISS index
dimension = embeddings.shape[1]
index = faiss.IndexFlatIP(dimension)
norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
normalized = embeddings / (norms + 1e-10)
index.add(np.array(normalized))


def search_procedures(query, top_k=5):
    # Semantic search
    query_embedding = model.encode([query])
    query_norm = query_embedding / (np.linalg.norm(query_embedding) + 1e-10)
    distances, indices = index.search(np.array(query_norm), top_k)
    semantic_results = {int(i): float(d) for i, d in zip(indices[0], distances[0])}

    # BM25
    tokenized_query = query.lower().split()
    bm25_scores = bm25.get_scores(tokenized_query)
    max_bm25 = max(bm25_scores) if max(bm25_scores) > 0 else 1
    bm25_normalized = bm25_scores / max_bm25
    keyword_indices = np.argsort(bm25_scores)[::-1][:top_k]
    keyword_results = {int(i): float(bm25_normalized[i]) for i in keyword_indices}

    # Combine
    combined = {}
    for i, score in semantic_results.items():
        combined[i] = {"semantic_score": score, "keyword_score": keyword_results.get(i, 0.0)}
    for i, score in keyword_results.items():
        if i not in combined:
            combined[i] = {"semantic_score": 0.0, "keyword_score": score}

    results = []
    for i, scores in combined.items():
        relevance = round((scores["semantic_score"] * 0.7) + (scores["keyword_score"] * 0.3), 4)
        row = data.iloc[i]
        results.append({
            "process": str(row["process"]),
            "category": str(row["category"]),
            "step": str(row["step"]),
            "documents_required": str(row["documents_required"]),
            "fees": str(row["fees"]),
            "time": str(row["time"]),
            "details": str(row["details"]),
            "relevance_score": relevance
        })

    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return results


def is_procedure_query(query):
    """Detect if query is about government procedures"""
    keywords = [
        "how to apply", "apply for", "process", "procedure", "documents required",
        "fees", "steps", "register", "registration", "licence", "license",
        "passport", "aadhaar", "voter id", "fir", "bail", "rti", "birth certificate",
        "death certificate", "marriage certificate", "property", "driving",
        "what documents", "how do i get", "how can i get", "kaise", "documents needed"
    ]
    query_lower = query.lower()
    return any(k in query_lower for k in keywords)