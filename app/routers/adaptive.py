# app/routers/adaptive.py
from typing import Optional, List, Dict, Any
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

# these functions are implemented in your adaptive engine module
from src.adaptive.engine import (
    create_tables,
    get_user_skill,
    get_next_question,
    update_user_skill,
    record_interaction,
)

logger = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/adaptive", tags=["adaptive"])


# --- Request / Response models ---


class StartReq(BaseModel):
    user_id: str = Field(..., description="User identifier (string)")


class StartResp(BaseModel):
    user_id: str
    skill: float


class NextReq(BaseModel):
    user_id: str
    allowed_question_ids: Optional[List[int]] = Field(
        None, description="Optional whitelist of question ids"
    )
    target_p: Optional[float] = Field(0.7, description="Target probability (0-1)")
    exclude_last_n: Optional[int] = Field(20, description="How many recent Qs to exclude")


class NextResp(BaseModel):
    question_id: int
    question: str
    distractors: List[str]
    difficulty: str
    explanation: Optional[str] = None
    topic: Optional[str] = None


class RecordReq(BaseModel):
    user_id: str
    question_id: int
    difficulty: str = Field(..., description="easy|medium|hard")
    is_correct: bool


class RecordResp(BaseModel):
    user_id: str
    new_skill: float
    expected_score: float
    actual_score: float


# --- Startup: ensure tables exist (runs when router is included in FastAPI app) ---
@router.on_event("startup")
def _ensure_tables():
    try:
        create_tables()
        logger.info("Adaptive tables ensured on startup.")
    except Exception as e:
        # log but do not crash import — startup should fail loudly if DB unavailable in prod
        logger.exception("Failed to ensure adaptive tables on startup: %s", e)


# --- Endpoints ---


@router.post("/start_session", response_model=StartResp)
def start_session(req: StartReq):
    """
    Return the current skill estimate for the user (or default if new).
    """
    try:
        skill = get_user_skill(req.user_id)
        return {"user_id": req.user_id, "skill": skill}
    except Exception as e:
        logger.exception("start_session error for user %s: %s", req.user_id, e)
        raise HTTPException(status_code=500, detail="Failed to start session")


@router.post("/next_question", response_model=NextResp)
def next_question(req: NextReq):
    """
    Return the next recommended question for the user.
    """
    try:
        out = get_next_question(
            req.user_id,
            allowed_ids=req.allowed_question_ids,
            target_p=float(req.target_p) if req.target_p is not None else 0.7,
            exclude_last_n=int(req.exclude_last_n) if req.exclude_last_n is not None else 20,
        )
        if out is None:
            raise HTTPException(status_code=404, detail="No questions available")
        # Ensure output matches NextResp shape or convert
        # Expected `out` keys: question_id, question, distractors, difficulty, explanation, topic
        return NextResp(
            question_id=int(out["question_id"]),
            question=str(out["question"]),
            distractors=list(out.get("distractors") or []),
            difficulty=str(out.get("difficulty") or "medium"),
            explanation=out.get("explanation"),
            topic=out.get("topic"),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("next_question error for user %s: %s", req.user_id, e)
        raise HTTPException(status_code=500, detail="Failed to fetch next question")


@router.post("/record_answer", response_model=RecordResp)
def record_answer(req: RecordReq):
    """
    Record user's answer → update skill and log interaction.
    Returns new_skill, expected score and actual score for this item.
    """
    try:
        # update_user_skill should return new_skill, expected, actual (as your engine defines)
        new_skill, expected, actual = update_user_skill(req.user_id, req.difficulty, req.is_correct)
    except Exception as e:
        logger.exception("Error updating skill for user %s: %s", req.user_id, e)
        raise HTTPException(status_code=500, detail="Failed to update user skill")

    # record interaction is best-effort (non-blocking for the response)
    try:
        record_interaction(req.user_id, req.question_id, req.is_correct)
    except Exception as e:
        logger.exception("Failed to record interaction for user %s: %s", req.user_id, e)

    return RecordResp(
        user_id=req.user_id,
        new_skill=float(new_skill),
        expected_score=float(expected),
        actual_score=float(actual),
    )
