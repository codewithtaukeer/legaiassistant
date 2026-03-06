from rag.pdf_loader import load_pdf_text
from rag.text_chunker import chunk_text

text = load_pdf_text("part3.pdf")

chunks = chunk_text(text)

print("Total chunks:", len(chunks))
print("\nFirst chunk:\n")
print(chunks[0])