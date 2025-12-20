# src/train/predict_difficulty.py
"""
Utility to load the saved TF-IDF vectorizer + difficulty model and provide
a single function predict_difficulty(text) -> (label, (classes_list, probs_list))

Probs are returned as a tuple (classes_list, probs_list) for clarity.

Usage:
    from src.train.predict_difficulty import predict_difficulty
    label, (classes, probs) = predict_difficulty("What is 2+2?")
"""
from pathlib import Path
from typing import List, Tuple
import joblib
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "models"
VEC_PATH = MODEL_DIR / "tfidf_vectorizer.joblib"
MODEL_PATH = MODEL_DIR / "difficulty_model.joblib"

# internal cache
_vectorizer = None
_model = None
_classes: List[str] | None = None


def _load_artifacts() -> None:
    """
    Lazy-load vectorizer and model into module-level vars.
    Raises FileNotFoundError or RuntimeError on problems.
    """
    global _vectorizer, _model, _classes

    if _vectorizer is not None and _model is not None and _classes is not None:
        return

    if not VEC_PATH.exists() or not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model artifacts not found. Expected files:\n - {VEC_PATH}\n - {MODEL_PATH}"
        )

    _vectorizer = joblib.load(VEC_PATH)
    _model = joblib.load(MODEL_PATH)

    # Validate model
    if not hasattr(_model, "classes_") or not hasattr(_model, "predict_proba"):
        raise RuntimeError("Loaded model does not expose required attributes: classes_ and predict_proba()")

    _classes = list(_model.classes_)


def predict_difficulty(text: str) -> Tuple[str, Tuple[List[str], List[float]]]:
    """
    Predict difficulty label for a question text.

    Returns:
      label (str),
      (classes_list, probs_list)

    Example:
      label, (classes, probs) = predict_difficulty("What is 2+2?")
    """
    if not isinstance(text, str):
        raise ValueError("Input text must be a string.")

    _load_artifacts()

    # type: ignore — mypy-unfriendly globals, but runtime-safe after _load_artifacts
    X = _vectorizer.transform([text])
    probs = _model.predict_proba(X)[0]  # shape (n_classes,)

    # Ensure ordering matches classes
    classes = list(_classes)  # snapshot
    probs_list = [float(x) for x in probs]

    # pick label with highest probability
    max_idx = int(np.argmax(probs))
    label = classes[max_idx]

    return label, (classes, probs_list)


if __name__ == "__main__":
    import sys
    import json

    # If a text argument is provided, run in CLI/JSON mode for integration
    if len(sys.argv) > 1:
        text = sys.argv[1]
        try:
            lbl, (clss, pr) = predict_difficulty(text)
            print(json.dumps({
                "label": lbl,
                "classes": clss,
                "probs": pr,
            }))
        except Exception as e:
            # Surface a structured error so the caller can log it
            print(json.dumps({
                "error": str(e),
            }))
            sys.exit(1)
    else:
        # quick interactive demo
        try:
            s = "What is the derivative of sin(x)?"
            lbl, (clss, pr) = predict_difficulty(s)
            print("Input:", s)
            print("Predicted label:", lbl)
            print("Classes:", clss)
            print("Probs:", pr)
        except Exception as e:
            print("Error:", e)
            print("Make sure you've run the trainer and saved artifacts to:", MODEL_DIR)
