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


def _normalize_token(s: str) -> str:
    """Normalize a token for robust comparison."""
    return str(s or "").strip().lower()


def _parse_correct_list(ref: Any) -> list[str]:
    """
    Accepts list or comma/semicolon-separated string for multi-correct answers.
    This keeps things flexible with how correct answers are stored.
    """
    if isinstance(ref, list):
        return [_normalize_token(x) for x in ref]
    if isinstance(ref, str):
        parts = [p.strip() for p in ref.replace(";", ",").split(",") if p.strip()]
        return [_normalize_token(p) for p in parts]
    return []


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
    total: float = 0.0
    for ans in req.answers:
        # Normalize answer types
        stud = ans.answer
        ref = ans.correctAnswer or ""

        score: float = 0.0
        is_correct: bool = False
        justification: str = ""

        # 1) Multi-select MCQ
        if isinstance(stud, list):
            student_choices = {_normalize_token(x) for x in stud}
            correct_choices = set(_parse_correct_list(ref))

            if not correct_choices:
                score = 0.0
                justification = "No reference answer configured."
            else:
                correctly_selected = student_choices & correct_choices
                missed = correct_choices - student_choices
                extra = student_choices - correct_choices

                # Base partial credit on fraction of correct options selected
                base = 10.0 * (len(correctly_selected) / len(correct_choices))

                # Small penalty for extra wrong options (up to -3 points)
                penalty = min(3.0, 1.0 * len(extra))
                score = max(0.0, round(base - penalty, 2))

                is_correct = len(missed) == 0 and len(extra) == 0
                justification = (
                    f"Selected {len(correctly_selected)}/{len(correct_choices)} correct options; "
                    f"{len(extra)} extra, {len(missed)} missed."
                )

        else:
            s = _normalize_token(stud)
            r = _normalize_token(ref)

            # 2) Short reference answer (single MCQ / short text)
            if r and len(str(ref).split()) <= 5:

                def simplify(x: str) -> str:
                    # Strip common prefixes like 'option', 'choice', etc.
                    for prefix in ["option ", "choice ", "answer "]:
                        if x.startswith(prefix):
                            x = x[len(prefix):]
                    return x

                s_simple = simplify(s)
                r_simple = simplify(r)

                if s_simple == r_simple:
                    score = 10.0
                    is_correct = True
                    justification = "Exact match (normalized)."
                else:
                    score = 0.0
                    is_correct = False
                    justification = f"Expected: {ref}"

            # 3) Longer text answer – similarity-based with stricter threshold
            else:
                score, justification = _score_text_answer(s, r)
                # tighten the correctness threshold so only strong matches are "correct"
                is_correct = score >= 8.5

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
