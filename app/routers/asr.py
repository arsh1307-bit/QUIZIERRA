# app/routers/asr.py
from fastapi import APIRouter, UploadFile, File, HTTPException
import whisper
import tempfile, os

router = APIRouter()

# WARNING: whisper model load can be heavy. Use small model or cloud ASR in production.
try:
    model = whisper.load_model("small")
except Exception:
    model = None

@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="ASR model not available")
    # save to temp
    tmpfd, tmppath = tempfile.mkstemp(suffix=".wav")
    with os.fdopen(tmpfd, "wb") as f:
        f.write(await file.read())
    try:
        res = model.transcribe(tmppath)
        return {"text": res.get("text"), "language": res.get("language")}
    finally:
        try: os.remove(tmppath)
        except: pass
