# app/routers/difficulty.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.difficulty_service import DifficultyService
from app.config import LOG_PATH
import json, os
from datetime import datetime

router = APIRouter()
svc = DifficultyService()

class QRequest(BaseModel):
    question: str
    user_hash: str | None = None
    session_id: str | None = None

def _log(entry: dict):
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    entry["ts"] = datetime.utcnow().isoformat() + "Z"
    try:
        with open(LOG_PATH, "a", encoding="utf8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        pass

@router.post("/difficulty")
def predict(req: QRequest):
    try:
        out = svc.predict(req.question)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
    # log minimal info
    _log({
        "question_preview": req.question[:200],
        "predicted": out.get("difficulty"),
        "probs": out.get("probs"),
        "classes": out.get("classes"),
        "user_hash": req.user_hash,
        "session_id": req.session_id
    })
    return out
