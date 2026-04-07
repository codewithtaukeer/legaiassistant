from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Literal
from backend.rag.argue_engine import argue_case, practice_mode

# Adjust this import based on your auth setup
# from auth import get_current_user

router = APIRouter(prefix="/argue", tags=["Argue Mode"])


# ── Request / Response Models ─────────────────────────────────────────────────

class ArgueRequest(BaseModel):
    case_text: str = Field(..., min_length=20, description="The case facts to analyze")
    mode: Literal["all", "plaintiff", "defendant", "judge"] = Field(
        default="all",
        description="Which perspective(s) to generate"
    )


class PracticeRequest(BaseModel):
    case_text: str = Field(..., min_length=20, description="The case facts")
    user_side: Literal["plaintiff", "defendant"] = Field(
        ..., description="Which side the user is arguing"
    )
    user_argument: str = Field(
        ..., min_length=10, description="The user's submitted argument"
    )


class ArgueResponse(BaseModel):
    success: bool
    data: dict
    mode: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/analyze", response_model=ArgueResponse)
async def analyze_case(request: ArgueRequest):
    """
    Argue Both Sides endpoint.
    Generates plaintiff arguments, defendant arguments, and judge reasoning.
    Mode 'all' returns all three. Other modes return only the requested perspective.
    """
    if not request.case_text.strip():
        raise HTTPException(status_code=400, detail="Case text cannot be empty")

    try:
        result = await argue_case(
            case_text=request.case_text,
            mode=request.mode
        )

        # Check if any role returned an error
        for role, data in result.items():
            if isinstance(data, dict) and "error" in data:
                raise HTTPException(
                    status_code=500,
                    detail=f"Error generating {role} argument: {data['error']}"
                )

        return ArgueResponse(success=True, data=result, mode=request.mode)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/practice", response_model=ArgueResponse)
async def practice(request: PracticeRequest):
    """
    Practice Mode endpoint.
    User submits their argument for one side.
    AI responds as the opposing counsel and a judge evaluates the user's argument.
    """
    if not request.case_text.strip():
        raise HTTPException(status_code=400, detail="Case text cannot be empty")

    if not request.user_argument.strip():
        raise HTTPException(status_code=400, detail="Please provide your argument")

    try:
        result = await practice_mode(
            case_text=request.case_text,
            user_side=request.user_side,
            user_argument=request.user_argument
        )

        return ArgueResponse(success=True, data=result, mode="practice")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def argue_health():
    """Quick health check for the argue router."""
    return {"status": "ok", "router": "argue"}