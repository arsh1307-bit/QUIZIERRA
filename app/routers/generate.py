# app/routers/generate.py
import os
import json
import logging
import tempfile
from typing import List, Dict, Any, Optional

from pydantic import BaseModel, Field
from fastapi import Body
from fastapi.responses import JSONResponse
from fastapi import APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv

from app.services.pdf_extract import extract_text_from_pdf
from src.train.predict_difficulty import predict_difficulty
from src.adaptive.engine import get_connection

# Gemini SDK
from google import generativeai as genai

load_dotenv()  # loads .env into environment variables if present

router = APIRouter()
logger = logging.getLogger("uvicorn.error")

# Required env vars
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")  # or "gemini-2.5-flash"

if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not set. Endpoint will fail until set.")
else:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        logger.exception("Failed to configure Gemini SDK: %s", e)
        # Keep going — we'll raise when the endpoint is invoked


def _find_json_array(raw: str) -> str:
    """
    Extract the first balanced JSON array substring from raw text.
    This handles cases where the model prepends commentary or includes extra text.
    Returns the JSON substring or raises ValueError.
    """
    start = raw.find("[")
    if start == -1:
        raise ValueError("No '[' found in model output.")

    stack = []
    i = start
    while i < len(raw):
        ch = raw[i]
        if ch == "[":
            stack.append("[")
        elif ch == "]":
            if not stack:
                raise ValueError("Unexpected closing bracket in output.")
            stack.pop()
            if not stack:
                # return substring from start to current index (inclusive)
                return raw[start : i + 1]
        i += 1

    raise ValueError("Unbalanced brackets in model output; couldn't extract JSON array.")


async def generate_mcq_from_text_gemini(text: str, num_questions: int = 5) -> List[Dict[str, Any]]:
    """
    Use Gemini to generate a JSON array of MCQs from the extracted text.
    Output format expected: a JSON array of objects, each with keys:
    question, distractors (3), answer, difficulty (easy|medium|hard), explanation (opt), topic (opt)
    """
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not configured in environment.")

    if not isinstance(num_questions, int) or not (1 <= num_questions <= 50):
        raise ValueError("num_questions must be an integer between 1 and 50.")

    # Keep the source snippet size-restricted to avoid huge prompts; prefer salient extraction upstream
    src = text[:20000]

    prompt = f"""
You are an assistant that converts source text into {num_questions} high-quality multiple-choice questions (MCQs).
Rules:
- Return ONLY valid JSON (no extra commentary).
- Output a JSON array with exactly {num_questions} objects.
- Each object must have keys: "question", "distractors" (array of 3 strings), "answer" (string),
  "difficulty" (one of "easy","medium","hard"), "explanation" (optional), "topic" (optional).
- Ensure distractors are plausible and not duplicates of the answer.
- Questions should be clear, unambiguous, and grounded in the source text.
- Use short texts (avoid very long explanations).
Source text:
\"\"\"{src}\"\"\" 
Return only the JSON array.
"""

    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        # Use generate_content; tune temperature/other params as needed
        response = model.generate_content(prompt)
        # response may expose .text or may need str()
        raw = ""
        try:
            raw = getattr(response, "text", None) or str(response)
        except Exception:
            raw = str(response)

        # Defensive extraction of the JSON array using bracket-matching
        try:
            json_str = _find_json_array(raw)
        except ValueError as e:
            logger.warning("Falling back to simple bracket search: %s", e)
            # last-resort: attempt simple find
            s = raw.find("[")
            epos = raw.rfind("]")
            if s == -1 or epos == -1 or epos <= s:
                raise ValueError("Model output did not contain a JSON array.")
            json_str = raw[s : epos + 1]

        mcqs_raw = json.loads(json_str)

        # Validate/normalize each item
        out: List[Dict[str, Any]] = []
        for idx, item in enumerate(mcqs_raw):
            if not isinstance(item, dict):
                raise ValueError(f"MCQ item {idx} is not an object.")
            q = (item.get("question") or item.get("stem") or "").strip()
            if not q:
                raise ValueError(f"MCQ item {idx} missing 'question' field.")

            # Handle options/distractors/answer permutations
            distractors = item.get("distractors") or item.get("options") or []
            answer = item.get("answer") or item.get("correct_answer") or item.get("correct") or ""

            # If options is a list of 4 including the answer, separate them
            if isinstance(distractors, list) and answer and answer in distractors:
                distractors = [opt for opt in distractors if opt != answer]

            # Ensure distractors is a list of strings
            if isinstance(distractors, str):
                distractors = [distractors]
            distractors = [str(x).strip() for x in distractors][:3]

            # If there are less than 3 distractors, fill with empty strings (caller can decide)
            while len(distractors) < 3:
                distractors.append("")

            difficulty = (item.get("difficulty") or "medium").lower()
            difficulty = difficulty if difficulty in ("easy", "medium", "hard") else "medium"
            explanation = item.get("explanation", "") or ""
            topic = item.get("topic", "general") or "general"

            out.append(
                {
                    "question": q,
                    "distractors": distractors,
                    "answer": (answer or "").strip(),
                    "difficulty": difficulty,
                    "explanation": explanation,
                    "topic": topic,
                }
            )

        # If model returned fewer/greater items, we warn but return what we have
        if len(out) != num_questions:
            logger.warning("Model returned %d MCQs (expected %d).", len(out), num_questions)

        return out

    except Exception as e:
        logger.exception("Error generating MCQs with Gemini: %s", e)
        raise RuntimeError(f"LLM generation error: {e}")


# -----------------------
# DB helper: save MCQs (usable by /from_pdf and /from_text)
# -----------------------
def save_mcqs_to_db(mcqs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Insert normalized MCQ dicts into the questions table.
    Each item in mcqs must contain keys: question, distractors, answer, difficulty, explanation, topic
    Returns list of saved items with database-assigned 'id'.
    """
    con = get_connection()
    cur = con.cursor()
    saved = []
    try:
        for item in mcqs:
            # Normalize difficulty via ML predictor (optional override)
            try:
                ml_label, _ = predict_difficulty(item["question"])
                difficulty = ml_label or item.get("difficulty", "medium")
            except Exception:
                difficulty = item.get("difficulty", "medium")

            distractors_json = json.dumps(item.get("distractors", []), ensure_ascii=False)

            cur.execute(
                "INSERT INTO questions (question, text, difficulty, answer, distractors, topic, explanation, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    item["question"],
                    item.get("text", item["question"]),
                    difficulty,
                    item["answer"],
                    distractors_json,
                    item.get("topic", "general"),
                    item.get("explanation", ""),
                    json.dumps(item, ensure_ascii=False),
                ),
            )
            qid = cur.lastrowid
            saved.append({"id": qid, **item, "difficulty": difficulty})

        con.commit()
        return saved
    except Exception:
        con.rollback()
        logger.exception("DB insert error in save_mcqs_to_db:")
        raise
    finally:
        con.close()


@router.post("/from_pdf")
async def generate_from_pdf(file: UploadFile = File(...), num_questions: int = 5):
    # Validate file
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed.")

    # Save to a secure temporary file
    tmp_file = None
    try:
        suffix = os.path.splitext(file.filename)[1] or ".pdf"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_file = tmp.name
            tmp.write(await file.read())

        # Extract text
        text = extract_text_from_pdf(tmp_file)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("PDF processing error: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {e}")

    finally:
        # Clean up temp file
        try:
            if tmp_file and os.path.exists(tmp_file):
                os.remove(tmp_file)
        except Exception:
            pass

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="PDF contained no extractable text.")

    # Generate MCQs: use Gemini-based generator
    try:
        mcqs = await generate_mcq_from_text_gemini(text, num_questions)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected LLM error: %s", e)
        raise HTTPException(status_code=500, detail="Unexpected error during question generation.")

    # Save MCQs to DB using helper
    try:
        saved = save_mcqs_to_db(mcqs)
    except Exception as e:
        logger.exception("DB insert error after generation: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return {"generated": saved}


# -----------------------
# /from_text endpoint + Pydantic schemas
# -----------------------
class GenerateTextRequest(BaseModel):
    text: str = Field(..., description="Source text to generate MCQs from")
    num_questions: int = Field(5, ge=1, le=50, description="Number of MCQs to generate (1-50)")
    use_structured: bool = Field(False, description="If true, prefer Gemini structured output mode (if supported)")


class MCQItem(BaseModel):
    question: str
    distractors: List[str]
    answer: str
    difficulty: str = "medium"
    explanation: Optional[str] = None
    topic: Optional[str] = None


class GenerateTextResponse(BaseModel):
    generated: List[MCQItem]


@router.post("/from_text", response_model=GenerateTextResponse)
async def generate_from_text(payload: GenerateTextRequest = Body(...)):
    """
    Generate MCQs from a raw text payload (JSON). Uses the same Gemini-based generator.
    If use_structured True, attempts to request structured output (SDK-dependent) and falls back to text extraction.
    """
    text = payload.text
    num_questions = payload.num_questions
    use_structured = payload.use_structured

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Empty text provided.")

    mcqs_raw = None

    # Try structured output mode first if requested and the SDK supports it
    if use_structured:
        try:
            model = genai.GenerativeModel(GEMINI_MODEL)
            # Many Gemini SDKs support a `response_format`/`structured_output` param.
            # We try a best-effort call; if it fails (TypeError/AttributeError) we fallback.
            try:
                # Replace the response_format arg below with your SDK-specific structured output config
                response = model.generate_content(
                    prompt=f"Generate {num_questions} MCQs from the source text. Return only JSON array.",
                    # example: response_format={"type":"json_schema","json_schema": {...}}
                )
                raw = getattr(response, "text", None) or str(response)
                json_str = _find_json_array(raw)
                mcqs_raw = json.loads(json_str)
                # Normalization follows below (same as generate_mcq_from_text_gemini)
            except TypeError:
                # SDK doesn't accept structured flag this way — fallback to normal generator
                mcqs_raw = None
        except Exception:
            mcqs_raw = None

    # If no structured result, call the normal generator
    if mcqs_raw is None:
        mcqs = await generate_mcq_from_text_gemini(text, num_questions)
    else:
        # we still normalize using the same routine for consistency
        try:
            # Ensure mcqs_raw is a list of dicts
            if not isinstance(mcqs_raw, list):
                raise ValueError("Structured output was not a JSON array.")
            # Normalize items (simple normalization; reusing logic)
            normalized = []
            for item in mcqs_raw:
                q = (item.get("question") or item.get("stem") or "").strip()
                distractors = item.get("distractors") or item.get("options") or []
                answer = item.get("answer") or item.get("correct_answer") or item.get("correct") or ""
                if isinstance(distractors, list) and answer and answer in distractors:
                    distractors = [opt for opt in distractors if opt != answer]
                if isinstance(distractors, str):
                    distractors = [distractors]
                distractors = [str(x).strip() for x in distractors][:3]
                while len(distractors) < 3:
                    distractors.append("")
                difficulty = (item.get("difficulty") or "medium").lower()
                difficulty = difficulty if difficulty in ("easy", "medium", "hard") else "medium"
                explanation = item.get("explanation", "") or ""
                topic = item.get("topic", "general") or "general"

                normalized.append({
                    "question": q,
                    "distractors": distractors,
                    "answer": (answer or "").strip(),
                    "difficulty": difficulty,
                    "explanation": explanation,
                    "topic": topic
                })
            mcqs = normalized
        except Exception as e:
            logger.exception("Failed to normalize structured output: %s", e)
            # fallback to normal generation
            mcqs = await generate_mcq_from_text_gemini(text, num_questions)

    # Persist to DB using the shared helper (same behavior as /from_pdf)
    try:
        saved = save_mcqs_to_db(mcqs)
    except Exception as e:
        logger.exception("Failed to save generated MCQs to DB: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return JSONResponse({"generated": saved})
