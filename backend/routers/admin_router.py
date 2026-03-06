from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import get_db, User, ChatSession, Message
from backend.auth import get_current_user
from rag.pdf_vector_store import list_uploaded_pdfs, clear_pdf_index, pdf_metadata, pdf_chunks
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin@legal123")

router = APIRouter(prefix="/admin", tags=["admin"])


def verify_admin(current_user=Depends(get_current_user)):
    if current_user.username != ADMIN_USERNAME:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _=Depends(verify_admin)):
    total_users = db.query(func.count(User.id)).scalar()
    total_sessions = db.query(func.count(ChatSession.id)).scalar()
    total_messages = db.query(func.count(Message.id)).scalar()
    total_pdfs = len(set(m["filename"] for m in pdf_metadata)) if pdf_metadata else 0
    total_chunks = len(pdf_chunks)

    return {
        "total_users": total_users,
        "total_sessions": total_sessions,
        "total_messages": total_messages,
        "total_pdfs": total_pdfs,
        "total_chunks": total_chunks
    }


@router.get("/users")
def get_users(db: Session = Depends(get_db), _=Depends(verify_admin)):
    users = db.query(User).all()
    result = []
    for u in users:
        session_count = db.query(func.count(ChatSession.id)).filter(ChatSession.user_id == u.id).scalar()
        message_count = db.query(func.count(Message.id)).join(ChatSession).filter(ChatSession.user_id == u.id).scalar()
        result.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "created_at": u.created_at,
            "total_sessions": session_count,
            "total_messages": message_count
        })
    return {"users": result}


@router.delete("/user/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), _=Depends(verify_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.username == ADMIN_USERNAME:
        raise HTTPException(status_code=400, detail="Cannot delete admin user")

    # Delete all messages and sessions
    sessions = db.query(ChatSession).filter(ChatSession.user_id == user_id).all()
    for s in sessions:
        db.query(Message).filter(Message.session_id == s.id).delete()
    db.query(ChatSession).filter(ChatSession.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    return {"message": f"User {user.username} deleted successfully"}


@router.get("/pdfs")
def get_pdfs(_=Depends(verify_admin)):
    return {"pdfs": list_uploaded_pdfs()}


@router.delete("/pdfs/clear")
def admin_clear_pdfs(_=Depends(verify_admin)):
    clear_pdf_index()
    return {"message": "All PDFs cleared successfully"}


@router.delete("/pdfs/{filename}")
def delete_pdf(filename: str, _=Depends(verify_admin)):
    global pdf_metadata, pdf_chunks
    from rag.pdf_vector_store import pdf_metadata as meta, pdf_chunks as chunks
    import numpy as np
    import pickle
    from rag.pdf_vector_store import pdf_embeddings, CHUNKS_FILE, EMBEDDINGS_FILE, METADATA_FILE
    import rag.pdf_vector_store as pvs

    # Find indices to keep
    keep_indices = [i for i, m in enumerate(pvs.pdf_metadata) if m["filename"] != filename]

    if len(keep_indices) == len(pvs.pdf_metadata):
        raise HTTPException(status_code=404, detail="PDF not found")

    pvs.pdf_chunks = [pvs.pdf_chunks[i] for i in keep_indices]
    pvs.pdf_metadata = [pvs.pdf_metadata[i] for i in keep_indices]

    if pvs.pdf_embeddings is not None and len(keep_indices) > 0:
        pvs.pdf_embeddings = pvs.pdf_embeddings[keep_indices]
    else:
        pvs.pdf_embeddings = None

    # Save to disk
    os.makedirs("data", exist_ok=True)
    with open(CHUNKS_FILE, "wb") as f:
        pickle.dump(pvs.pdf_chunks, f)
    with open(METADATA_FILE, "wb") as f:
        pickle.dump(pvs.pdf_metadata, f)
    if pvs.pdf_embeddings is not None:
        np.save(EMBEDDINGS_FILE, pvs.pdf_embeddings)

    return {"message": f"{filename} deleted successfully"}