import pandas as pd
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from rank_bm25 import BM25Okapi

# Load dataset
data = pd.read_csv("data/legal_sections.csv")

documents = data["text"].tolist()

# Tokenized documents for BM25
tokenized_docs = [doc.split(" ") for doc in documents]

bm25 = BM25Okapi(tokenized_docs)

# Load embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Convert documents to embeddings
embeddings = model.encode(documents)

# FAISS index
dimension = embeddings.shape[1]
index = faiss.IndexFlatL2(dimension)
index.add(np.array(embeddings))


def search_legal_sections(query, top_k=3):

    # ---------- Semantic Search ----------
    query_embedding = model.encode([query])
    distances, indices = index.search(np.array(query_embedding), top_k)

    semantic_results = set(indices[0])

    # ---------- Keyword Search ----------
    tokenized_query = query.split(" ")
    bm25_scores = bm25.get_scores(tokenized_query)

    keyword_indices = np.argsort(bm25_scores)[::-1][:top_k]

    keyword_results = set(keyword_indices)

    # ---------- Combine ----------
    combined = list(semantic_results.union(keyword_results))

    results = []

    for i in combined:
        results.append({
            "act": str(data.iloc[i]["act"]),
            "section": int(data.iloc[i]["section"]),
            "title": str(data.iloc[i]["title"]),
            "text": str(data.iloc[i]["text"])
        })

    return results