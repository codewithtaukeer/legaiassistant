"""
Backend router for document generation and document-chat flow.
Intelligently extracts data from natural conversation using LLM.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
import os
import json

from backend.database import get_db, Message
from backend.auth import get_current_user
from backend.routers.chat_router import save_message
from backend.generator import (
    generate_fir_document,
    generate_legal_notice_document,
    generate_rental_agreement_document,
    generate_affidavit_document,
    extract_document_data_from_chat,
    detect_ipc_sections,
    get_risk_level,
)
from rag.language_detector import detect_language
from rag.translator import translate_to_english, translate_from_english

router = APIRouter(prefix="/documents", tags=["documents"])

DOC_TYPES = [
    {"id": "fir",      "name": "FIR (First Information Report)", "description": "File a criminal complaint with police",  "icon": "📋"},
    {"id": "notice",   "name": "Legal Notice",                   "description": "Send a formal legal warning",            "icon": "📬"},
    {"id": "rental",   "name": "Rental Agreement",               "description": "Create a landlord-tenant agreement",     "icon": "🏠"},
    {"id": "affidavit","name": "Affidavit",                      "description": "Create a sworn statement",               "icon": "✍️"},
]

# ─────────────────────────────────────────────────────────────────────────────
# Required fields per document type
# ─────────────────────────────────────────────────────────────────────────────
REQUIRED_FIELDS = {
    "fir": [
        "complainant_name",
        "father_name",
        "address",
        "incident_date",
        "incident_time",
        "location",
        "incident_details",
    ],
    "notice": [
        "complainant_name",
        "complainant_address",
        "respondent_name",
        "respondent_address",
        "issue",
        "demand",
        "reply_days",
    ],
    "rental": [
        "landlord_name",
        "landlord_address",
        "tenant_name",
        "tenant_address",
        "house_no",
        "property_address",
        "rent_amount",
        "security_deposit",
        "start_date",
        "end_date",
        "notice_period",
    ],
    "affidavit": [
        "name",
        "age",
        "occupation",
        "address",
        "issue",
        "additional_details",
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
# Human-readable fallback prompts for missing fields
# ─────────────────────────────────────────────────────────────────────────────
FIELD_PROMPTS = {
    "fir": {
        "complainant_name":  "Could you tell me your full name (the person filing this complaint)?",
        "father_name":       "What is your father's name?",
        "address":           "What is your home address?",
        "location":          "Where exactly did the incident happen?",
        "incident_date":     "On which date did this incident occur?",
        "incident_time":     "At what time did it happen?",
        "incident_details":  "Can you describe what happened in more detail?",
        "police_station":    "Which police station should we mention?",
        "district":          "Which district is this?",
    },
    "notice": {
        "complainant_name":    "What is your full name (the person sending this notice)?",
        "complainant_address": "What is your complete address?",
        "respondent_name":     "Who is this notice being sent to? (Full name of the recipient)",
        "respondent_address":  "What is the recipient's address?",
        "issue":               "What is the main issue or grievance for this notice?",
        "demand":              "What exactly do you demand from the recipient? (e.g., repayment of ₹X, stop harassment, vacate premises)",
        "reply_days":          "How many days should the recipient have to respond? (Default: 15 days)",
        "relationship":        "What is your relationship with the recipient? (e.g., employer, tenant, customer, neighbour)",
        "incident_dates":      "On which dates did the relevant events/incidents occur?",
        "demand_amount":       "Is there a specific monetary amount involved?",
        "custom_terms":        "Do you have any additional terms or demands to include? (or type 'no' to skip)",
    },
    "rental": {
        "landlord_name":    "What is the landlord's full name?",
        "landlord_address": "What is the landlord's permanent address?",
        "tenant_name":      "What is the tenant's full name?",
        "tenant_address":   "What is the tenant's permanent address (may differ from rented property)?",
        "house_no":         "What is the house/flat number being rented?",
        "property_address": "What is the complete address of the property (street, locality, city, pin)?",
        "rent_amount":      "What is the monthly rent amount (in ₹)?",
        "security_deposit": "What is the security deposit amount (in ₹)?",
        "start_date":       "What is the lease start date?",
        "end_date":         "What is the lease end date?",
        "notice_period":    "What is the notice period required to terminate the agreement? (e.g., 1 month, 2 months)",
        "lock_in_period":   "Is there a lock-in period during which neither party can terminate early? (e.g., 6 months, or type 'no')",
        "maintenance":      "Who is responsible for paying maintenance/society charges — landlord or tenant?",
        "utilities":        "Who pays for electricity, water, gas — landlord or tenant?",
        "custom_terms":     "Do you have any additional or special terms to add to the agreement? (e.g., no pets, parking included — or type 'no' to skip)",
    },
    "affidavit": {
        "name":               "What is the full name of the person making this affidavit (the deponent)?",
        "age":                "What is the deponent's age?",
        "occupation":         "What is the deponent's occupation?",
        "address":            "What is the deponent's complete residential address?",
        "id_proof":           "What ID proof will be used for verification? (Aadhaar / PAN / Voter ID / Passport)",
        "issue":              "What is the subject matter of this affidavit?",
        "additional_details": "Please describe all the facts and circumstances to be stated in the affidavit.",
        "purpose":            "What is the purpose / where will this affidavit be used? (e.g., court, government office, bank)",
        "custom_facts":       "Are there any additional facts or statements you want to include? (or type 'no' to skip)",
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────────────────────

class DocumentRequest(BaseModel):
    document_type: str
    # FIR
    name: str = None
    issue: str = None
    location: str = None
    complainant_name: str = None
    respondent_name: str = None
    police_station: str = None
    district: str = None
    state: str = None
    incident_date: str = None
    incident_time: str = None
    # Notice
    complainant_address: str = None
    respondent_address: str = None
    demand: str = None
    reply_days: str = None
    relationship: str = None
    incident_dates: str = None
    demand_amount: str = None
    # Rental
    landlord_name: str = None
    landlord_address: str = None
    tenant_name: str = None
    tenant_address: str = None
    house_no: str = None
    property_address: str = None
    rent_amount: str = None
    security_deposit: str = None
    start_date: str = None
    end_date: str = None
    notice_period: str = None
    lock_in_period: str = None
    maintenance: str = None
    utilities: str = None
    # Affidavit
    age: str = None
    occupation: str = None
    id_proof: str = None
    purpose: str = None
    # Shared
    additional_details: str = None
    custom_terms: str = None
    custom_facts: str = None


class DocumentChatRequest(BaseModel):
    session_id: Optional[str] = None
    document_type: Optional[str] = None
    message: str
    draft: Dict[str, Any] = Field(default_factory=dict)
    mode: str = "auto"
    force_generate: bool = False


class DocumentResponse(BaseModel):
    message: str
    document_type: str
    filename: str
    url: str


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _normalize_doc_type(doc_type: Optional[str]) -> Optional[str]:
    if not doc_type:
        return None
    doc_type = doc_type.strip().lower()
    if doc_type in {"fir", "notice", "rental", "affidavit"}:
        return doc_type
    if doc_type in {"legal notice", "legal_notice"}:
        return "notice"
    return None


def _as_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(x).strip() for x in value if str(x).strip()]
    if isinstance(value, str):
        v = value.strip()
        return [v] if v else []
    return [str(value).strip()]


def _is_empty(val: Any) -> bool:
    return not val or str(val).strip() in ("", "[Not provided]", "null", "None", "no", "No", "N/A")


def _get_missing_fields(doc_type: str, draft: Dict[str, Any]) -> List[str]:
    return [f for f in REQUIRED_FIELDS.get(doc_type, []) if _is_empty(draft.get(f))]


def _clean_draft(draft: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in draft.items() if not k.startswith("_")}


def _build_document(doc_type: str, draft: Dict[str, Any]) -> str:
    draft = _clean_draft(draft)

    if doc_type == "fir":
        return generate_fir_document(
            name=draft.get("name", "") or draft.get("father_name", ""),
            issue=draft.get("issue", "") or draft.get("incident_details", ""),
            location=draft.get("location", ""),
            complainant_name=draft.get("complainant_name") or draft.get("name", ""),
            respondent_name=draft.get("respondent_name"),
            police_station=draft.get("police_station"),
            district=draft.get("district"),
            state=draft.get("state") or "Uttar Pradesh",
            incident_date=draft.get("incident_date"),
            incident_time=draft.get("incident_time"),
            incident_details=draft.get("incident_details") or draft.get("issue", ""),
            witnesses=_as_list(draft.get("witnesses")),
            annexures=_as_list(draft.get("annexures")),
            fir_number=draft.get("fir_number"),
        )

    if doc_type == "notice":
        return generate_legal_notice_document(
            complainant_name=draft.get("complainant_name") or draft.get("name", ""),
            complainant_address=draft.get("complainant_address") or draft.get("location", ""),
            respondent_name=draft.get("respondent_name", ""),
            respondent_address=draft.get("respondent_address", ""),
            issue=draft.get("issue", ""),
            demand=draft.get("demand", ""),
            reply_days=int(draft.get("reply_days") or 15),
            relationship=draft.get("relationship", ""),
            incident_dates=draft.get("incident_dates", ""),
            demand_amount=draft.get("demand_amount", ""),
            additional_details=draft.get("additional_details", ""),
            custom_terms=draft.get("custom_terms", ""),
        )

    if doc_type == "rental":
        return generate_rental_agreement_document(
            landlord_name=draft.get("landlord_name") or draft.get("name", ""),
            landlord_address=draft.get("landlord_address", ""),
            tenant_name=draft.get("tenant_name", ""),
            tenant_address=draft.get("tenant_address", ""),
            house_no=draft.get("house_no", ""),
            property_address=draft.get("property_address") or draft.get("location", ""),
            rent_amount=draft.get("rent_amount", ""),
            security_deposit=draft.get("security_deposit", ""),
            start_date=draft.get("start_date", ""),
            end_date=draft.get("end_date", ""),
            notice_period=draft.get("notice_period", "1 month"),
            lock_in_period=draft.get("lock_in_period", ""),
            maintenance=draft.get("maintenance", ""),
            utilities=draft.get("utilities", ""),
            additional_details=draft.get("additional_details", ""),
            custom_terms=draft.get("custom_terms", ""),
        )

    if doc_type == "affidavit":
        return generate_affidavit_document(
            name=draft.get("name", ""),
            age=draft.get("age", ""),
            occupation=draft.get("occupation", ""),
            address=draft.get("address") or draft.get("location", ""),
            id_proof=draft.get("id_proof", ""),
            issue=draft.get("issue", ""),
            additional_details=draft.get("additional_details", ""),
            purpose=draft.get("purpose", ""),
            custom_facts=draft.get("custom_facts", ""),
        )

    raise HTTPException(status_code=400, detail="Invalid document type")


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=DocumentResponse)
async def generate_document(
    request: DocumentRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        doc_type = _normalize_doc_type(request.document_type)
        if not doc_type:
            raise HTTPException(status_code=400, detail="Invalid document type")

        draft = request.dict(exclude={"document_type"})
        filename = _build_document(doc_type, draft)
        return {
            "message": f"{doc_type.upper()} document generated successfully",
            "document_type": doc_type,
            "filename": filename,
            "url": f"/documents/download/{filename}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
def document_chat(
    request: DocumentChatRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    doc_type = _normalize_doc_type(request.document_type)

    # Language detection & translation
    session_lang = request.draft.get("_session_lang", "en")
    user_language = detect_language(request.message, session_lang=session_lang)
    english_message = (
        translate_to_english(request.message)
        if user_language not in ("en", "hinglish")
        else request.message
    )

    if request.session_id:
        save_message(db, request.session_id, "user", request.message)

    if not doc_type:
        return {
            "document_generated": False,
            "document_type": None,
            "draft": request.draft,
            "answer": "Please select a document type to get started.",
            "options": DOC_TYPES,
            "can_generate": False,
        }

    # Build conversation history
    history_text = ""
    if request.session_id:
        rows = db.query(Message).filter(
            Message.session_id == request.session_id
        ).order_by(Message.created_at).all()
        for row in rows[-10:]:
            speaker = "User" if row.role == "user" else "Assistant"
            history_text += f"{speaker}: {row.content}\n"

    chat_text = f"{history_text}\nUser (latest): {english_message}"

    # Force generate (user clicked button)
    if request.force_generate:
        try:
            filename = _build_document(doc_type, request.draft)
            answer = f"Your {doc_type.upper()} document is ready. You can download it below."
            if user_language not in ("en", "hinglish"):
                answer = translate_from_english(answer, user_language)
            if request.session_id:
                save_message(db, request.session_id, "assistant", answer)
            return {
                "document_generated": True,
                "document_type": doc_type,
                "draft": _clean_draft(request.draft),
                "answer": answer,
                "download_url": f"/generated_documents/{filename}",
                "can_generate": True,
            }
        except Exception:
            pass

    # LLM extraction + merge
    merged = extract_document_data_from_chat(
        chat_text=chat_text,
        document_type=doc_type,
        existing_draft=_clean_draft(request.draft),
        mode=request.mode,
    )

    smart_reply       = merged.pop("_smart_reply", "").strip()
    detected_intent   = merged.pop("_detected_intent", "provide_info")
    llm_ready         = merged.pop("_ready_to_generate", False)
    merged["_session_lang"] = user_language

    clean_merged = _clean_draft(merged)

    # IPC detection (FIR only)
    issue_text = clean_merged.get("incident_details") or clean_merged.get("issue") or english_message
    ipc_sections = detect_ipc_sections(issue_text) if doc_type == "fir" else []
    risk = get_risk_level(issue_text) if doc_type == "fir" else None

    missing_fields = _get_missing_fields(doc_type, clean_merged)

    # All data ready → generate
    if not missing_fields or llm_ready or request.force_generate:
        try:
            filename = _build_document(doc_type, clean_merged)
            answer = f"✅ Your {doc_type.upper()} is ready to download!"
            if smart_reply:
                answer = smart_reply + f"\n\n✅ Your {doc_type.upper()} is ready to download!"
            if user_language not in ("en", "hinglish"):
                answer = translate_from_english(answer, user_language)
            if request.session_id:
                save_message(db, request.session_id, "assistant", answer)
            return {
                "document_generated": True,
                "document_type": doc_type,
                "draft": clean_merged,
                "answer": answer,
                "download_url": f"/generated_documents/{filename}",
                "can_generate": True,
                "ipc_sections": ipc_sections,
                "risk_level": risk,
            }
        except Exception:
            pass

    # Still missing fields → ask conversationally
    if smart_reply:
        answer = smart_reply
    else:
        first_missing = missing_fields[0] if missing_fields else None
        if first_missing:
            answer = FIELD_PROMPTS.get(doc_type, {}).get(
                first_missing,
                f"Could you please provide your {first_missing.replace('_', ' ')}?"
            )
        else:
            answer = "I have all the information needed. Let me generate your document now."

    # Append IPC info for FIR
    if ipc_sections and doc_type == "fir":
        ipc_text = "\n\n⚖️ **Applicable Legal Sections:**\n"
        for sec in ipc_sections[:3]:
            ipc_text += f"• {sec}\n"
        ipc_text += f"\n🔍 **Risk Level:** {risk}"
        answer += ipc_text

    if user_language not in ("en", "hinglish"):
        answer = translate_from_english(answer, user_language)

    if request.session_id:
        save_message(db, request.session_id, "assistant", answer)

    return {
        "document_generated": False,
        "document_type": doc_type,
        "draft": clean_merged,
        "answer": answer,
        "missing_fields": missing_fields,
        "can_generate": len(missing_fields) == 0,
        "ipc_sections": ipc_sections,
        "risk_level": risk,
    }


@router.get("/types")
async def get_document_types(current_user=Depends(get_current_user)):
    return {"types": DOC_TYPES}


@router.get("/download/{filename}")
def download_document(filename: str):
    file_path = os.path.join("generated_documents", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=file_path, media_type="application/pdf", filename=filename)