from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import List, Any
import difflib

router = APIRouter()


class StudentAnswer(BaseModel):
    questionId: str
    questionContent: str
    answer: Any
    correctAnswer: str | None = None
    timeTaken: float | None = 0.0


class GradeRequest(BaseModel):
    answers: List[StudentAnswer]


class GradedAnswer(BaseModel):
    questionId: str
    questionContent: str
    isCorrect: bool
    score: float
    justification: str
    answer: Any


class GradeResponse(BaseModel):
    gradedAnswers: List[GradedAnswer]
    finalScore: float


def _score_text_answer(student: str, reference: str) -> (float, str):
    if not reference:
        return 0.0, "No reference answer available."
    s = str(student or "").strip()
    r = str(reference or "").strip()
    ratio = difflib.SequenceMatcher(a=s.lower(), b=r.lower()).ratio()
    # Map ratio [0,1] to score out of 10
    score = round(ratio * 10.0, 2)
    justification = f"Similarity {ratio:.2f} vs reference."
    return score, justification


@router.post('/grade', response_model=GradeResponse)
async def grade_submission(req: GradeRequest):
    """Grade a submission with a simple, deterministic heuristic.

    This is a Python-only fallback grader that avoids requiring the LLM.
    It permits the frontend to rely on the Python backend for grading
    even when Node/Genkit AI flows are removed.
    """
    graded: List[GradedAnswer] = []
    total = 0.0
    for ans in req.answers:
        # Normalize answer types
        stud = ans.answer
        ref = ans.correctAnswer or ""

        if isinstance(stud, list):
            # For MCQ multi-select, simple exact-match count
            is_correct = any(str(s).strip() == str(ref).strip() for s in stud)
            score = 10.0 if is_correct else 0.0
            justification = "Exact match" if is_correct else "Does not match reference answer"
        else:
            # If ref is short (likely MCQ), compare exact
            if ref and len(ref.split()) <= 5:
                is_correct = str(stud).strip().lower() == str(ref).strip().lower()
                score = 10.0 if is_correct else 0.0
                justification = "Exact match" if is_correct else f"Expected: {ref}"
            else:
                # Text grading by similarity
                score, justification = _score_text_answer(str(stud), str(ref))
                is_correct = score >= 7.0

        graded.append(GradedAnswer(
            questionId=ans.questionId,
            questionContent=ans.questionContent,
            isCorrect=is_correct,
            score=score,
            justification=justification,
            answer=ans.answer
        ))
        total += score

    return GradeResponse(gradedAnswers=graded, finalScore=round(total, 2))
