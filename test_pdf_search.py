from rag.pdf_loader import load_pdf_text
from rag.text_chunker import chunk_text
from rag.pdf_vector_store import build_pdf_index, search_pdf

text = load_pdf_text("part3.pdf")

chunks = chunk_text(text)

build_pdf_index(chunks)

results = search_pdf("What does Article 12 define")

print("\nRESULTS:\n")

for r in results:
    print(r)
    print("------")