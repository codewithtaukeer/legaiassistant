from fastapi import FastAPI, UploadFile, File
from rag.retriever import search_legal_sections
from rag.generator import generate_answer
from rag.translator import translate_to_english, translate_from_english
from rag.language_detector import detect_language
from rag.pdf_loader import load_pdf_text, load_pdf_with_pages
from rag.text_chunker import chunk_text
from rag.pdf_vector_store import build_pdf_index, search_pdf, clear_pdf_index, list_uploaded_pdfs
from rag.conversation_store import create_session, add_message, get_history, delete_session

import os
import uuid

app = FastAPI()


@app.get("/")
def home():
    return {"message": "Legal AI system is running"}


@app.post("/session/new")
def new_session():
    session_id = create_session()
    return {"session_id": session_id}


@app.get("/ask")
def ask_question(question: str, session_id: str = None):

    user_language = detect_language(question)
    english_question = translate_to_english(question)

    pdf_results = search_pdf(english_question)
    sections = search_legal_sections(english_question)

    # Build PDF context with citation info
    pdf_context = [
        {
            "act": f"PDF: {r['filename']}",
            "section": f"Chunk {r['chunk_index']}",
            "title": "PDF Content",
            "text": r["text"]
        }
        for r in pdf_results
    ]

    context = sections + pdf_context

    history = get_history(session_id) if session_id else []

    result = generate_answer(english_question, context, history)

    final_answer = result["answer"]
    if user_language != "en":
        final_answer = translate_from_english(final_answer, user_language)

    if session_id:
        add_message(session_id, question, final_answer)

    # Build full citations
    citations = []

    for s in sections:
        citations.append({
            "type": "law",
            "source": f"{s['act']} Section {s['section']}",
            "title": s["title"],
            "passage": s["text"],
            "relevance_score": s.get("relevance_score", 0.0)
        })

    for r in pdf_results:
        citations.append({
            "type": "pdf",
            "source": r["filename"],
            "page": r.get("page"),
            "passage": r["text"][:300] + "..." if len(r["text"]) > 300 else r["text"],
            "relevance_score": r.get("relevance_score", 0.0)
        })

    # Sort citations by relevance
    # Filter low relevance citations before returning
    citations = [c for c in citations if c["relevance_score"] > 0.3]
    citations.sort(key=lambda x: x["relevance_score"], reverse=True)

    return {
        "session_id": session_id,
        "question": question,
        "answer": final_answer,
        "relevant_laws": result["relevant_laws"],
        "summary": result["summary"],
        "citations": citations
    }


@app.get("/session/{session_id}/history")
def session_history(session_id: str):
    history = get_history(session_id)
    return {"session_id": session_id, "history": history}


@app.delete("/session/{session_id}")
def end_session(session_id: str):
    delete_session(session_id)
    return {"message": "Session deleted"}


@app.get("/pdfs")
def get_uploaded_pdfs():
    return {"uploaded_pdfs": list_uploaded_pdfs()}


@app.post("/upload_pdf")
async def upload_pdf(file: UploadFile = File(...)):
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{uuid.uuid4()}.pdf"
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Load with page numbers
    pages = load_pdf_with_pages(file_path)

    all_chunks = []
    all_pages = []

    for page_num, page_text in pages:
        chunks = chunk_text(page_text)
        all_chunks.extend(chunks)
        all_pages.extend([page_num] * len(chunks))

    build_pdf_index(all_chunks, filename=file.filename, page_numbers=all_pages)

    return {"message": f"{file.filename} uploaded and indexed successfully"}


@app.delete("/clear_pdfs")
def clear_pdfs():
    clear_pdf_index()
    return {"message": "PDF index cleared"}