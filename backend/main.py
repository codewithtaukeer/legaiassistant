from fastapi import FastAPI, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from concurrent.futures import ThreadPoolExecutor

from rag.retriever import search_legal_sections
from rag.generator import generate_answer
from rag.translator import translate_to_english, translate_from_english
from rag.language_detector import detect_language
from rag.pdf_loader import load_pdf_text, load_pdf_with_pages
from rag.text_chunker import chunk_text
from rag.pdf_vector_store import build_pdf_index, search_pdf, clear_pdf_index, list_uploaded_pdfs
from rag.procedure_retriever import search_procedures, is_procedure_query
from rag.case_retriever import search_case_laws

from backend.database import get_db
from backend.auth import get_current_user
from backend.routers import auth_router, chat_router, admin_router
from backend.routers.chat_router import save_message

from apscheduler.schedulers.background import BackgroundScheduler
from rag.news_fetcher import fetch_all_news, get_cached_news


import os
import uuid

app = FastAPI(title="Legal AI Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5174", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(chat_router.router)
app.include_router(admin_router.router)

scheduler = BackgroundScheduler()
scheduler.add_job(fetch_all_news, 'interval', hours=4, id='news_fetch')
scheduler.start()

@app.on_event("startup")
def startup_event():
    # Fetch news on startup if cache is empty
    import os
    if not os.path.exists("data/legal_news_cache.json"):
        fetch_all_news()

@app.get("/")
def home():
    return {"message": "Legal AI system is running"}


@app.get("/ask")
def ask_question(
    question: str,
    session_id: str = None,
    mode: str = "auto",
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    from backend.database import ChatSession

    if session_id:
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        ).first()
        if not session:
            session_id = None

    user_language = detect_language(question)
    english_question = translate_to_english(question) if user_language not in ("en", "hinglish") else question

    is_procedure = is_procedure_query(english_question)

    with ThreadPoolExecutor() as executor:
        future_pdf        = executor.submit(search_pdf, english_question)
        future_sections   = executor.submit(search_legal_sections, english_question)
        future_procedures = executor.submit(search_procedures, english_question, 5) if is_procedure else None
        future_cases      = executor.submit(search_case_laws, english_question, 3) if not is_procedure else None

        pdf_results = future_pdf.result()
        sections    = future_sections.result()
        procedures  = future_procedures.result() if future_procedures else []
        case_laws   = future_cases.result() if future_cases else []

    pdf_results = [r for r in pdf_results if r.get("relevance_score", 0) > 0.35]

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

    history = []
    if session_id:
        from backend.database import Message
        messages = db.query(Message).filter(
            Message.session_id == session_id
        ).order_by(Message.created_at).all()
        for m in messages[-8:]:
            history.append({"question": m.content, "answer": ""} if m.role == "user" else {"question": "", "answer": m.content})

    result = generate_answer(english_question, context, history, procedures, user_language, case_laws, mode=mode)

    final_answer = result["answer"]
    if user_language not in ("en", "hinglish"):
        final_answer = translate_from_english(final_answer, user_language)

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
    for p in procedures:
        if p["relevance_score"] > 0.2:
            citations.append({
                "type": "procedure",
                "source": p["process"],
                "title": p["step"],
                "passage": f"Documents: {p['documents_required']} | Fees: {p['fees']} | Time: {p['time']}",
                "relevance_score": p["relevance_score"]
            })
    for c in case_laws:
        if c["relevance_score"] > 0.5:
            citations.append({
                "type": "case",
                "source": c["case_name"],
                "title": f"{c['court']} • {c['year']}",
                "passage": c["significance"],
                "relevance_score": c["relevance_score"]
            })

    citations = [c for c in citations if c["relevance_score"] > 0.3]
    citations.sort(key=lambda x: x["relevance_score"], reverse=True)

    if session_id:
        save_message(db, session_id, "user", question)
        save_message(db, session_id, "assistant", final_answer, result["relevant_laws"], citations)

    return {
        "session_id": session_id,
        "question": question,
        "answer": final_answer,
        "case_analysis": result.get("case_analysis", ""),
        "relevant_laws": result["relevant_laws"],
        "summary": result["summary"],
        "citations": citations,
        "related_questions": result.get("related_questions", [])
    }

@app.get("/news")
def get_news(current_user=Depends(get_current_user)):
    data = get_cached_news()
    return data

@app.post("/news/refresh")
def refresh_news(current_user=Depends(get_current_user)):
    articles = fetch_all_news()
    return {
        "message": f"Fetched {len(articles)} articles",
        "last_updated": articles[0]["published"] if articles else None
    }

class FeedbackRequest(BaseModel):
    message_id: str
    feedback: str


feedback_store = {}


@app.post("/feedback")
def submit_feedback(
    body: FeedbackRequest,
    current_user=Depends(get_current_user)
):
    feedback_store[body.message_id] = {
        "user_id": current_user.id,
        "feedback": body.feedback
    }
    return {"message": "Feedback recorded, thank you!"}


@app.post("/upload_pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{uuid.uuid4()}.pdf"
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    pages = load_pdf_with_pages(file_path)
    all_chunks = []
    all_pages = []
    for page_num, page_text in pages:
        chunks = chunk_text(page_text)
        all_chunks.extend(chunks)
        all_pages.extend([page_num] * len(chunks))

    build_pdf_index(all_chunks, filename=file.filename, page_numbers=all_pages)
    return {"message": f"{file.filename} uploaded and indexed successfully"}


@app.get("/pdfs")
def get_uploaded_pdfs(current_user=Depends(get_current_user)):
    return {"uploaded_pdfs": list_uploaded_pdfs()}


@app.delete("/clear_pdfs")
def clear_pdfs(current_user=Depends(get_current_user)):
    clear_pdf_index()
    return {"message": "PDF index cleared"}