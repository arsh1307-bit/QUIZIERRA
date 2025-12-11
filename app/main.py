# app/main.py
from fastapi import FastAPI
import uvicorn
from app.config import DEFAULT_PORT

# import routers
from app.routers.difficulty import router as difficulty_router
from app.routers.adaptive import router as adaptive_router
from app.routers.qgen import router as qgen_router
from app.routers.health import router as health_router
from app.routers.proctor import router as proctor_router
'''from app.routers.asr import router as asr_router'''
from app.routers.users import router as users_router
from app.routers.generate import router as generate_router

app = FastAPI(title="Quizierra API")

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

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=DEFAULT_PORT, reload=True)





