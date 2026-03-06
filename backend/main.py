from fastapi import FastAPI
from fastapi import UploadFile, File

from rag.retriever import search_legal_sections
from rag.generator import generate_answer
from rag.translator import translate_to_english, translate_from_english
from rag.language_detector import detect_language

from rag.pdf_loader import load_pdf_text
from rag.text_chunker import chunk_text
from rag.pdf_vector_store import build_pdf_index, search_pdf

import os
import uuid
import json

app = FastAPI()


@app.get("/")
def home():
    return {"message": "Legal AI system is running"}


@app.get("/ask")
def ask_question(question: str):

    # 1️⃣ Detect language
    user_language = detect_language(question)

    # 2️⃣ Translate to English
    english_question = translate_to_english(question)

    # 3️⃣ Search PDF documents
    pdf_results = search_pdf(english_question)

    # 4️⃣ Search legal dataset
    sections = search_legal_sections(english_question)

    # 5️⃣ Format PDF results
    pdf_context = [
        {
            "act": "Uploaded PDF",
            "section": "Document",
            "title": "PDF Content",
            "text": r
        }
        for r in pdf_results
    ]

    # 6️⃣ Combine context
    context = sections + pdf_context

    # 7️⃣ Generate answer (already returns JSON)
    result = generate_answer(english_question, context)

    # 8️⃣ Translate answer if needed
    final_answer = result["answer"]

    if user_language != "en":
        final_answer = translate_from_english(final_answer, user_language)

    # 9️⃣ Return response
    return {
        "question": question,
        "answer": final_answer,
        "relevant_laws": result["relevant_laws"],
        "summary": result["summary"]
    }


@app.post("/upload_pdf")
async def upload_pdf(file: UploadFile = File(...)):

    os.makedirs("uploads", exist_ok=True)

    file_path = f"uploads/{uuid.uuid4()}.pdf"

    contents = await file.read()

    with open(file_path, "wb") as f:
        f.write(contents)

    # Extract text
    text = load_pdf_text(file_path)

    # Chunk text
    chunks = chunk_text(text)

    # Build vector index
    build_pdf_index(chunks)

    return {"message": "PDF uploaded and indexed successfully"}