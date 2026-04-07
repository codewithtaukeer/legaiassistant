from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
import httpx
import asyncio
import pandas as pd
import os
from sentence_transformers import SentenceTransformer
import numpy as np
from backend.auth import get_current_user

router = APIRouter(prefix="/cases", tags=["Case Finder"])

# Load local CSV as fallback
_local_cases = None
_model = None
_local_embeddings = None

# Legal keywords for domain-specific filtering
LEGAL_KEYWORDS = {
    "employment": ["dismissal", "fired", "termination", "employee", "employer", "workplace", "labor", "wage", "salary"],
    "criminal": ["murder", "assault", "theft", "crime", "criminal", "prosecution", "accused", "guilty"],
    "civil": ["contract", "breach", "negligence", "dispute", "claim", "damages"],
    "property": ["property", "land", "lease", "tenancy", "ownership", "mortgage"],
    "family": ["divorce", "marriage", "custody", "child", "inheritance", "will"],
    "corporate": ["company", "shareholders", "directors", "corporate", "business", "merger"],
}

def get_model():
    """Load embedding model - use larger model for better legal understanding."""
    global _model
    if _model is None:
        try:
            # Try larger model first (better for legal domain)
            _model = SentenceTransformer("all-mpnet-base-v2")
        except:
            # Fallback to smaller model
            _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

def get_local_cases():
    """Load local case database and compute embeddings."""
    global _local_cases, _local_embeddings
    if _local_cases is None:
        csv_path = "data/case_laws.csv"
        if os.path.exists(csv_path):
            _local_cases = pd.read_csv(csv_path).fillna("")
            # Create combined text for embedding
            texts = []
            for _, row in _local_cases.iterrows():
                text = f"{row.get('case_name', '')} {row.get('summary', '')} {row.get('significance', '')} {row.get('act', '')}"
                texts.append(text)
            
            m = get_model()
            embs = m.encode(texts, show_progress_bar=False)
            norms = np.linalg.norm(embs, axis=1, keepdims=True)
            _local_embeddings = embs / (norms + 1e-10)
    return _local_cases, _local_embeddings

def detect_case_category(text: str) -> Optional[str]:
    """Detect legal category from query text."""
    text_lower = text.lower()
    category_scores = {}
    
    for category, keywords in LEGAL_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            category_scores[category] = score
    
    if category_scores:
        return max(category_scores, key=category_scores.get)
    return None

def expand_query(query: str) -> str:
    """Expand query with related legal terms."""
    query_lower = query.lower()
    expansions = []
    
    # Employment-related
    if any(term in query_lower for term in ["dismiss", "fired", "termination", "employee"]):
        expansions.extend(["employment law", "labor law", "wrongful termination", "unfair dismissal"])
    
    # Harassment-related
    if "harass" in query_lower:
        expansions.extend(["workplace harassment", "sexual harassment", "hostile work environment"])
    
    # Arrest/procedure-related
    if any(term in query_lower for term in ["arrest", "police", "procedure"]):
        expansions.extend(["criminal procedure", "arrest procedures", "due process"])
    
    if expansions:
        return query + " " + " ".join(expansions[:3])
    return query

def calculate_relevance_score(result_text: str, query: str, category: Optional[str] = None) -> float:
    """Calculate combined relevance score."""
    # Semantic similarity
    m = get_model()
    query_emb = m.encode([query])
    result_emb = m.encode([result_text])
    
    query_norm = query_emb / (np.linalg.norm(query_emb) + 1e-10)
    result_norm = result_emb / (np.linalg.norm(result_emb) + 1e-10)
    
    semantic_score = float((query_norm @ result_norm.T)[0][0])
    
    # Keyword matching
    query_lower = query.lower()
    result_lower = result_text.lower()
    query_terms = set(query_lower.split())
    result_terms = set(result_lower.split())
    
    intersection = query_terms & result_terms
    union = query_terms | result_terms
    keyword_score = len(intersection) / len(union) if union else 0
    
    # Category bonus
    category_bonus = 0
    if category:
        category_keywords = LEGAL_KEYWORDS.get(category, [])
        if any(kw in result_lower for kw in category_keywords):
            category_bonus = 0.15
    
    # Combine scores
    final_score = (semantic_score * 0.6) + (keyword_score * 0.25) + category_bonus
    return min(max(final_score, 0), 1)

# ── Indian Kanoon API ─────────────────────────────────────────────────────────
INDIAN_KANOON_API = "https://api.indiankanoon.org"
IK_TOKEN = os.getenv("INDIAN_KANOON_TOKEN", "")

async def search_indian_kanoon(query: str, page: int = 0) -> List[dict]:
    """Search Indian Kanoon API with relevance filtering."""
    if not IK_TOKEN:
        return []
    
    headers = {
        "Authorization": f"Token {IK_TOKEN}",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    
    try:
        expanded_query = expand_query(query)
        category = detect_case_category(query)
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{INDIAN_KANOON_API}/search/",
                headers=headers,
                data={"formInput": expanded_query, "pagenum": page}
            )
            if resp.status_code != 200:
                return []
            
            data = resp.json()
            docs = data.get("docs", [])
            results = []
            
            for doc in docs[:10]:
                case_name = doc.get("title", "Unknown Case")
                summary = doc.get("headline", "No summary available")
                
                relevance = calculate_relevance_score(
                    f"{case_name} {summary}",
                    query,
                    category
                )
                
                # Only include results with minimum relevance
                if relevance > 0.35:
                    results.append({
                        "case_name": case_name,
                        "court": doc.get("docsource", "Unknown Court"),
                        "year": str(doc.get("publishdate", ""))[:4] if doc.get("publishdate") else "N/A",
                        "summary": summary,
                        "significance": doc.get("headline", ""),
                        "section": doc.get("cite", ""),
                        "act": "",
                        "source": "Indian Kanoon",
                        "url": f"https://indiankanoon.org/doc/{doc.get('tid', '')}/",
                        "relevance_score": relevance,
                        "tid": doc.get("tid", ""),
                    })
            
            results.sort(key=lambda x: x["relevance_score"], reverse=True)
            return results[:5]
            
    except Exception as e:
        print(f"Error searching Indian Kanoon: {e}")
        return []

async def get_case_detail(tid: str) -> dict:
    """Get full case details from Indian Kanoon."""
    if not IK_TOKEN or not tid:
        return {}
    headers = {"Authorization": f"Token {IK_TOKEN}"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{INDIAN_KANOON_API}/doc/{tid}/",
                headers=headers
            )
            if resp.status_code != 200:
                return {}
            data = resp.json()
            return {
                "verdict": data.get("judgment", "")[:2000],
                "bench": data.get("bench", ""),
                "citations": data.get("citations", []),
                "full_text_preview": data.get("doc", "")[:1500],
            }
    except Exception:
        return {}

def search_local_cases(query: str, top_k: int = 5) -> List[dict]:
    """Search local CSV with improved relevance scoring."""
    df, embeddings = get_local_cases()
    if df is None or embeddings is None:
        return []
    
    m = get_model()
    category = detect_case_category(query)
    expanded_query = expand_query(query)
    
    # Encode expanded query
    q_emb = m.encode([expanded_query])
    q_norm = q_emb / (np.linalg.norm(q_emb) + 1e-10)
    
    # Calculate semantic scores
    semantic_scores = (embeddings @ q_norm.T).flatten()
    
    # Enhance with keyword matching
    enhanced_scores = []
    for semantic_score in semantic_scores:
        # For each result, we'll calculate final score
        enhanced_scores.append(semantic_score)
    
    # Re-calculate with full context
    final_scores = []
    for idx, row_data in df.iterrows():
        case_name = row_data.get("case_name", "")
        summary = row_data.get("summary", "")
        significance = row_data.get("significance", "")
        act = row_data.get("act", "")
        
        result_text = f"{case_name} {summary} {significance} {act}"
        
        # Calculate full relevance score
        final_score = calculate_relevance_score(result_text, query, category)
        final_scores.append(final_score)
    
    # Filter by threshold
    min_threshold = 0.35
    scored_results = [(i, score) for i, score in enumerate(final_scores) if score >= min_threshold]
    
    if not scored_results:
        # If no results meet threshold, get top K anyway
        scored_results = sorted(enumerate(final_scores), key=lambda x: x[1], reverse=True)[:top_k]
    else:
        # Sort by score and take top K
        scored_results = sorted(scored_results, key=lambda x: x[1], reverse=True)[:top_k]
    
    # Build results
    results = []
    for idx, score in scored_results:
        row_data = df.iloc[idx]
        results.append({
            "case_name": str(row_data.get("case_name", "")),
            "court": str(row_data.get("court", "")),
            "year": str(row_data.get("year", "")),
            "summary": str(row_data.get("summary", "")),
            "significance": str(row_data.get("significance", "")),
            "section": str(row_data.get("section", "")),
            "act": str(row_data.get("act", "")),
            "source": "Local Database",
            "url": "",
            "relevance_score": float(score),
        })
    
    return results

# ── Request/Response Models ───────────────────────────────────────────────────

class CaseSearchRequest(BaseModel):
    query: str = Field(..., min_length=10, description="Case description or facts")
    top_k: int = Field(default=5, ge=1, le=10)
    source: str = Field(default="both", description="'kanoon', 'local', or 'both'")

class CaseDetailRequest(BaseModel):
    tid: str

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/search")
async def find_similar_cases(
    request: CaseSearchRequest,
    current_user=Depends(get_current_user)
):
    """Find similar cases with improved relevance scoring."""
    query = request.query.strip()
    
    kanoon_task = None
    if request.source in ("kanoon", "both") and IK_TOKEN:
        kanoon_task = search_indian_kanoon(query)
    
    local_results = []
    if request.source in ("local", "both"):
        local_results = search_local_cases(query, top_k=request.top_k)
    
    kanoon_results = []
    if kanoon_task:
        kanoon_results = await kanoon_task
    
    # Merge and deduplicate
    all_results = kanoon_results + local_results
    seen = set()
    merged = []
    for r in all_results:
        key = r["case_name"].lower().strip()
        if key not in seen:
            seen.add(key)
            merged.append(r)
    
    # Sort by relevance
    merged.sort(key=lambda x: x["relevance_score"], reverse=True)
    
    # Filter results below confidence threshold
    filtered_results = [r for r in merged if r["relevance_score"] > 0.40]
    
    # If too few results, include some lower-scoring ones
    if len(filtered_results) < 3:
        filtered_results = merged[:request.top_k]
    else:
        filtered_results = filtered_results[:request.top_k]
    
    return {
        "query": query,
        "results": filtered_results,
        "total": len(filtered_results),
        "category": detect_case_category(query),
        "sources_used": {
            "indian_kanoon": len([r for r in filtered_results if r["source"] == "Indian Kanoon"]),
            "local_db": len([r for r in filtered_results if r["source"] == "Local Database"]),
            "api_available": bool(IK_TOKEN),
        }
    }

@router.post("/detail")
async def get_full_case(
    request: CaseDetailRequest,
    current_user=Depends(get_current_user)
):
    """Get full case details including verdict from Indian Kanoon."""
    detail = await get_case_detail(request.tid)
    if not detail:
        raise HTTPException(status_code=404, detail="Case details not available")
    return detail

@router.get("/health")
async def case_health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "indian_kanoon_configured": bool(IK_TOKEN),
        "local_db_available": os.path.exists("data/case_laws.csv"),
        "embedding_model": "all-mpnet-base-v2",
        "relevance_threshold": 0.40,
    }