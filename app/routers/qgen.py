# app/routers/qgen.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from app.services.qgen_service import generate_question_from_text
from app.services.pdf_service import extract_text_from_pdf
from pathlib import Path
import uuid, os

router = APIRouter()

class GenRequest(BaseModel):
    text: str

@router.post("/from_text")
def from_text(req: GenRequest):
    out = generate_question_from_text(req.text)
    return out

@router.post("/from_pdf")
async def from_pdf(file: UploadFile = File(...)):
    # save temp
    tmp_dir = Path("data/temp")
    tmp_dir.mkdir(parents=True, exist_ok=True)
    tmp_path = tmp_dir / f"{uuid.uuid4().hex}_{file.filename}"
    with open(tmp_path, "wb") as f:
        f.write(await file.read())
    try:
        text = extract_text_from_pdf(str(tmp_path))
        # chunk first N chars for a quick call
        preview = text[:2000]
        out = generate_question_from_text(preview)
        # optionally delete tmp
        try: os.remove(tmp_path)
        except: pass
        return {"generated": out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
