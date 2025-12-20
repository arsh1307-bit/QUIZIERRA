# app/services/qgen_service.py
from app.config import GEMINI_API_KEY
import os, json

def generate_question_from_text(passage:str):
    """
    Minimal wrapper. If GEMINI_API_KEY present, this function should call provider.
    For now returns a placeholder structure so frontend can preview.
    Replace the placeholder with actual API calls.
    """
    if not GEMINI_API_KEY:
        # placeholder: simple templated MCQ (developer must replace)
        return {
            "question": passage.strip()[:120] + " ... (short Q?)",
            "answer": "ANSWER_PLACEHOLDER",
            "distractors": ["A","B","C"],
            "difficulty": "medium",
            "topic": "general"
        }
    # If key exists, you can implement API call here.
    # Keep it outside of this template for security.
    return {
        "question": passage.strip()[:120]+" ... (LLM generated)",
        "answer":"LLM_ANSWER",
        "distractors":["d1","d2","d3"],
        "difficulty":"medium",
        "topic":"general"
    }
