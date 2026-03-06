from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db, ChatSession, Message, User
from backend.auth import get_current_user
import uuid
import json
from datetime import datetime

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/session/new")
def new_session(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session_id = str(uuid.uuid4())
    session = ChatSession(
        id=session_id,
        user_id=current_user.id,
        title="New Chat"
    )
    db.add(session)
    db.commit()
    return {"session_id": session_id}


@router.get("/sessions")
def get_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sessions = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id
    ).order_by(ChatSession.updated_at.desc()).all()

    return {
        "sessions": [
            {
                "session_id": s.id,
                "title": s.title,
                "created_at": s.created_at,
                "updated_at": s.updated_at
            }
            for s in sessions
        ]
    }


@router.get("/session/{session_id}/messages")
def get_messages(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = db.query(Message).filter(
        Message.session_id == session_id
    ).order_by(Message.created_at).all()

    return {
        "session_id": session_id,
        "title": session.title,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "relevant_laws": json.loads(m.relevant_laws),
                "citations": json.loads(m.citations),
                "created_at": m.created_at
            }
            for m in messages
        ]
    }


@router.delete("/session/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.query(Message).filter(Message.session_id == session_id).delete()
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}


def save_message(db, session_id, role, content, relevant_laws=[], citations=[]):
    message = Message(
        session_id=session_id,
        role=role,
        content=content,
        relevant_laws=json.dumps(relevant_laws),
        citations=json.dumps(citations)
    )
    db.add(message)

    # Update session title from first user message
    if role == "user":
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if session and session.title == "New Chat":
            session.title = content[:50] + "..." if len(content) > 50 else content
            session.updated_at = datetime.utcnow()

    db.commit()