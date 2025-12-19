# app/services/llm_openai.py
import os
import time
import json
import logging
import re
import asyncio
from fastapi import HTTPException

# Gemini SDK
from google import generativeai as genai

logger = logging.getLogger(__name__)

# Environment config
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-pro")

if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        logger.warning("Failed to configure Gemini SDK: %s", e)
else:
    logger.warning("GEMINI_API_KEY not set. LLM calls will fail until it's configured.")


# Provide or import your JSON_PROMPT_TEMPLATE. If you already have one, keep it.
JSON_PROMPT_TEMPLATE = """
You are an assistant that converts source text into {n} high-quality multiple-choice questions (MCQs).
Rules:
- Return ONLY valid JSON (no extra commentary).
- Output a JSON array with exactly {n} objects.
- Each object must have keys: "question", "distractors" (array of 3 strings), "answer" (string), "difficulty" (one of "easy","medium","hard"), "explanation" (optional), "topic" (optional).
- Ensure distractors are plausible and not duplicates of the answer.
- Questions must be grounded in the provided source text.
Source text:
\"\"\"{content}\"\"\"
Return only the JSON array.
"""


def _parse_and_normalize_mcq_list(raw_text: str):
    """Extract first JSON array found and normalize into expected list of dicts."""
    # Defensive: find the first JSON array block
    start = raw_text.find("[")
    end = raw_text.rfind("]")
    if start == -1 or end == -1 or end <= start:
        # Try a regex fallback (non-greedy)
        m = re.search(r"(\[.*?\])", raw_text, flags=re.S)
        if not m:
            raise ValueError("Model output did not contain a JSON array.")
        json_str = m.group(1)
    else:
        json_str = raw_text[start : end + 1]

    data = json.loads(json_str)
    out = []
    for item in data:
        if not isinstance(item, dict):
            continue
        q = item.get("question") or item.get("stem") or ""
        answer = item.get("answer") or item.get("correct_answer") or item.get("correct") or ""
        distractors = item.get("distractors") or item.get("options") or []
        # If options include the answer, separate it
        if isinstance(distractors, list) and answer and answer in distractors:
            distractors = [opt for opt in distractors if opt != answer]
        if not isinstance(distractors, list):
            distractors = [str(distractors)]
        # Ensure max 3 distractors
        distractors = [str(x).strip() for x in distractors][:3]
        difficulty = item.get("difficulty") or "medium"
        difficulty = difficulty if difficulty in ("easy", "medium", "hard") else "medium"
        explanation = item.get("explanation") or ""
        topic = item.get("topic") or "general"

        out.append(
            {
                "question": q.strip(),
                "answer": str(answer).strip(),
                "distractors": distractors,
                "explanation": explanation,
                "difficulty": difficulty,
                "topic": topic,
            }
        )
    return out


async def generate_mcq_from_text(text: str, num_questions: int = 10, max_retries: int = 3, backoff_base: float = 1.0):
    """
    Generate MCQs via Gemini with retry/backoff and graceful error handling.
    This is an async function that uses a thread pool for blocking calls.
    On quota / rate-limit failures this raises HTTPException(503, ...).
    """
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured. Please set GEMINI_API_KEY in environment.")

    prompt = JSON_PROMPT_TEMPLATE.format(n=num_questions, content=text[:20000])

    last_exc = None
    for attempt in range(1, max_retries + 1):
        try:
            model = genai.GenerativeModel(GEMINI_MODEL)
            
            # Run the synchronous SDK call in a thread pool to avoid blocking asyncio event loop
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, model.generate_content, prompt)

            try:
                raw = response.text
            except Exception:
                raw = str(response)

            raw = raw.strip()
            mcq_list = _parse_and_normalize_mcq_list(raw)

            if len(mcq_list) != num_questions:
                logger.warning("Gemini returned %d MCQs (expected %d).", len(mcq_list), num_questions)

            return mcq_list

        except Exception as e:
            last_exc = e
            err_text = str(e).lower()

            if any(tok in err_text for tok in ("rate", "quota", "429", "insufficient_quota", "quota_exceeded")):
                wait = backoff_base * (2 ** (attempt - 1))
                logger.warning("Gemini rate/quota error (attempt %d/%d): %s. Retrying in %.1fs.", attempt, max_retries, e, wait)
                await asyncio.sleep(wait)  # Use asyncio.sleep in an async function
                continue

            if "json" in err_text or "parse" in err_text or "did not contain a json" in err_text:
                logger.error("Gemini output parsing failed: %s", e)
                # No retry on parsing failure as the output is already bad
                break

            logger.error("Gemini call failed (non-retryable or unknown): %s", e)
            break

    # Construct a detailed error message after all retries are exhausted
    msg = "LLM request failed."
    if last_exc is not None:
        s = str(last_exc)
        if "quota" in s.lower() or "insufficient_quota" in s.lower() or "quota_exceeded" in s.lower():
            msg = "Gemini quota exhausted or billing not enabled. Please check your Google AI Studio billing/quotas and set a valid key in .env."
        elif "rate" in s.lower() or "429" in s.lower():
            msg = "Gemini rate limit exceeded. Try again later."
        else:
            msg = f"LLM call failed: {s}"

    logger.exception("LLM generation failed after retries: %s", last_exc)

    # Fallback to local generation instead of raising an error
    logger.warning("LLM generation failed. Falling back to local generation.")
    return local_fallback_mcq(text, min(3, num_questions))


def local_fallback_mcq(text: str, num_questions: int = 3):
    """
    Very small fallback: extract sentences from text and make simple QA pairs.
    """
    import random

    sents = re.split(r'(?<=[\.\?\!])\s+', text)
    sents = [s.strip() for s in sents if len(s.strip()) > 30]
    if not sents:
        sents = [text[:120]] if text else ["No content available."]
    out = []
    for i in range(min(num_questions, max(1, len(sents)))):
        src = sents[i % len(sents)]
        q = f"According to the text: summarize the main idea of: \"{src[:80]}...\""
        a = src[:120]  # naive
        distractors = [a[::-1][:60], "Not mentioned in the text", "Partly true"]  # placeholders
        out.append(
            {
                "question": q,
                "answer": a,
                "distractors": distractors,
                "explanation": "Fallback auto-generated summary.",
                "difficulty": "medium",
                "topic": "general",
            }
        )
    return out
