# app/main.py
from fastapi import FastAPI, Request
import uvicorn
from app.config import DEFAULT_PORT
import logging

# import routers
from app.routers.difficulty import router as difficulty_router
from app.routers.adaptive import router as adaptive_router
from app.routers.qgen import router as qgen_router
from app.routers.health import router as health_router
from app.routers.proctor import router as proctor_router
'''from app.routers.asr import router as asr_router'''
from app.routers.users import router as users_router
from app.routers.generate import router as generate_router
from app.routers.grade import router as grade_router

app = FastAPI(title="Quizierra API")

# Request logging
logger = logging.getLogger("app.request")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    try:
        body_bytes = await request.body()
        body_text = body_bytes.decode('utf-8', errors='ignore') if body_bytes else ''
    except Exception:
        body_text = '<could not read body>'

    logger.info("Incoming request: %s %s Body: %s", request.method, request.url.path, (body_text[:1000] + '...') if len(body_text) > 1000 else body_text)
    response = await call_next(request)
    logger.info("Response: %s %s -> %s", request.method, request.url.path, response.status_code)
    return response

# include routers
# Health router: include without a prefix so endpoints appear at /health and /version
app.include_router(health_router, tags=["health"])

# Other routers use explicit prefixes (do NOT end with a trailing slash)
app.include_router(difficulty_router, prefix="/predict", tags=["difficulty"])
app.include_router(adaptive_router, prefix="/adaptive", tags=["adaptive"])
app.include_router(qgen_router, prefix="/qgen", tags=["qgen"])
app.include_router(proctor_router, prefix="/proctor", tags=["proctor"])
'''app.include_router(asr_router, prefix="/asr", tags=["asr"])'''
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(generate_router, prefix="/ai", tags=["generation"])
app.include_router(grade_router, prefix="/ai", tags=["grading"])

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=DEFAULT_PORT, reload=True)





