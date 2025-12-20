# app/routers/proctor.py
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.proctor_service import analyze_frame_meta

router = APIRouter()

class FrameMeta(BaseModel):
    face_count: int | None = 0
    face_present: bool | None = True
    gaze_score: float | None = 1.0
    user_hash: str | None = None
    session_id: str | None = None

@router.post("/frame_event")
def frame_event(meta: FrameMeta):
    events = analyze_frame_meta(meta.dict())
    return {"events": events}
