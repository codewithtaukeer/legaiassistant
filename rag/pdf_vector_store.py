import numpy as np
from sentence_transformers import SentenceTransformer
import pickle
import os

model = SentenceTransformer("all-MiniLM-L6-v2")

CHUNKS_FILE = "data/pdf_chunks.pkl"
EMBEDDINGS_FILE = "data/pdf_embeddings.npy"
METADATA_FILE = "data/pdf_metadata.pkl"

if os.path.exists(CHUNKS_FILE):
    with open(CHUNKS_FILE, "rb") as f:
        pdf_chunks = pickle.load(f)
else:
    pdf_chunks = []

if os.path.exists(EMBEDDINGS_FILE):
    pdf_embeddings = np.load(EMBEDDINGS_FILE)
else:
    pdf_embeddings = None

if os.path.exists(METADATA_FILE):
    with open(METADATA_FILE, "rb") as f:
        pdf_metadata = pickle.load(f)
else:
    pdf_metadata = []


def build_pdf_index(chunks, filename="unknown", page_numbers=None):
    global pdf_chunks, pdf_embeddings, pdf_metadata

    from datetime import datetime
    upload_time = datetime.now().isoformat()

    pdf_chunks.extend(chunks)
    new_embeddings = model.encode(chunks)

    for i, chunk in enumerate(chunks):
        pdf_metadata.append({
            "filename": filename,
            "chunk_index": len(pdf_metadata),
            "page": page_numbers[i] if page_numbers and i < len(page_numbers) else None,
            "upload_time": upload_time
        })

    if pdf_embeddings is None:
        pdf_embeddings = new_embeddings
    else:
        pdf_embeddings = np.vstack([pdf_embeddings, new_embeddings])

    os.makedirs("data", exist_ok=True)
    with open(CHUNKS_FILE, "wb") as f:
        pickle.dump(pdf_chunks, f)
    with open(METADATA_FILE, "wb") as f:
        pickle.dump(pdf_metadata, f)
    np.save(EMBEDDINGS_FILE, pdf_embeddings)


def search_pdf(query, top_k=3):
    if pdf_embeddings is None or len(pdf_chunks) == 0 or len(pdf_metadata) == 0:
        return []

    min_len = min(len(pdf_chunks), len(pdf_metadata))
    if min_len == 0:
        return []

    query_embedding = model.encode([query])[0]
    # Normalize for cosine similarity
    norms = np.linalg.norm(pdf_embeddings[:min_len], axis=1, keepdims=True)
    normalized = pdf_embeddings[:min_len] / (norms + 1e-10)
    query_norm = query_embedding / (np.linalg.norm(query_embedding) + 1e-10)
    similarities = np.dot(normalized, query_norm)

    top_indices = similarities.argsort()[-top_k:][::-1]

    results = []
    for idx in top_indices:
        if idx < min_len:
            results.append({
                "text": pdf_chunks[idx],
                "filename": pdf_metadata[idx]["filename"],
                "chunk_index": pdf_metadata[idx]["chunk_index"],
                "page": pdf_metadata[idx].get("page"),
                "upload_time": pdf_metadata[idx]["upload_time"],
                "relevance_score": round(float(similarities[idx]), 4)
            })
    return results


def list_uploaded_pdfs():
    if not pdf_metadata:
        return []
    seen = {}
    for m in pdf_metadata:
        if m["filename"] not in seen:
            seen[m["filename"]] = m["upload_time"]
    return [{"filename": k, "upload_time": v} for k, v in seen.items()]


def clear_pdf_index():
    global pdf_chunks, pdf_embeddings, pdf_metadata
    pdf_chunks = []
    pdf_embeddings = None
    pdf_metadata = []

    for f in [CHUNKS_FILE, EMBEDDINGS_FILE, METADATA_FILE]:
        if os.path.exists(f):
            os.remove(f)