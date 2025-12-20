# app/routers/health.py
from fastapi import APIRouter
from app.config import LOG_PATH

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok", "log_path": str(LOG_PATH)}

@router.get("/version")
def version():
    return {"app": "Quizierra", "version": "v1.0.0"}
