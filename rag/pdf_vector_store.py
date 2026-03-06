from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")

pdf_chunks = []
pdf_embeddings = None


def build_pdf_index(chunks):

    global pdf_chunks, pdf_embeddings

    pdf_chunks = chunks

    pdf_embeddings = model.encode(chunks)


def search_pdf(query, top_k=3):

    global pdf_embeddings, pdf_chunks

    # If no PDF uploaded yet
    if pdf_embeddings is None:
        return []

    query_embedding = model.encode(query)

    similarities = np.dot(pdf_embeddings, query_embedding)

    top_indices = np.argsort(similarities)[-top_k:][::-1]

    results = []

    for i in top_indices:
        results.append(pdf_chunks[i])

    return results