# app/ai_client.py
import google.generativeai as genai
from app.config import GEMINI_API_KEY, GEMINI_MODEL

# -----------------------------------------
# Configure Gemini (required)
# -----------------------------------------
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY missing in .env — Gemini is required.")

genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel(GEMINI_MODEL)

# -----------------------------------------
# Unified generate() — Gemini only
# -----------------------------------------
async def generate(prompt: str, max_tokens: int = 512) -> str:
    """
    Calls Gemini only. No OpenAI fallback.
    """
    response = model.generate_content(prompt)
    return response.text
