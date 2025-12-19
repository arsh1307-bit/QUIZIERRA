# app/config.py
import os
from pathlib import Path
from dotenv import load_dotenv

# ---- Root and .env ----
# ROOT should be the project root directory (Quizierra-AI)
ROOT = Path(__file__).resolve().parents[1]  # app/.. -> project root
load_dotenv(ROOT / ".env")

# ---- Folders & paths ----
MODEL_DIR = Path(os.getenv("MODEL_DIR", ROOT / "models"))
DATA_DIR = Path(os.getenv("DATA_DIR", ROOT / "data"))

# ensure directories exist (safe to call at import time)
MODEL_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

LOG_PATH = Path(os.getenv("LOG_PATH", DATA_DIR / "interactions" / "log.jsonl"))
LOG_PATH.parent.mkdir(parents=True, exist_ok=True)

# ---- API keys and runtime defaults ----
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")  # optional for backwards compatibility

# Gemini/Google generative AI settings
# Default to 'gemini-pro' (works with many SDK versions). You can change to 'gemini-pro-latest'
# or to 1.5 names if your SDK supports them (see instructions below).
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-pro")

# Server port
DEFAULT_PORT = int(os.getenv("PORT", 8000))
