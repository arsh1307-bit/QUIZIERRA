# app/ai_client.py
"""Small wrapper around Google Generative AI (Gemini).

This module is import-safe: it does not raise at import time if
`GEMINI_API_KEY` is missing. Instead, `generate()` will return a
clear placeholder string when Gemini is not configured. This avoids
crashing the application on import while keeping behavior explicit.
"""
import logging
from typing import Optional

import google.generativeai as genai
from app.config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger(__name__)

# Lazy model handle — None if not configured
model: Optional[object] = None

if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(GEMINI_MODEL)
    except Exception as e:
        logger.warning("Failed to configure Gemini SDK at import: %s", e)
        model = None
else:
    logger.warning("GEMINI_API_KEY not set. Gemini calls will return a placeholder.")


async def generate(prompt: str, max_tokens: int = 512) -> str:
    """Generate text using Gemini if available, otherwise return placeholder.

    Returns:
        str: model text or a descriptive placeholder when Gemini isn't configured.
    """
    if model is None:
        return "[GEMINI not configured] GEMINI_API_KEY missing; no LLM available."

    try:
        response = model.generate_content(prompt)
        # Many SDK responses expose `.text`
        try:
            return response.text
        except Exception:
            return str(response)
    except Exception as e:
        logger.exception("Gemini generate() failed: %s", e)
        return f"[Gemini error] {e}"
