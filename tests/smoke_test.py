# tests/smoke_test.py
"""
Windows-friendly smoke test for Quizierra ML + Gemini pipeline.

Runs:
  1. Ensures ML model artifacts exist — if missing, runs trainer script.
  2. Tests predict_difficulty.
  3. Monkeypatches Gemini → Dummy model to test /ai/from_text without API key.
  4. Optional: /ai/from_pdf test (requires PDF path env var).

Run:
    python tests/smoke_test.py
"""

import os
import sys
import json
import subprocess
import traceback
from pathlib import Path

# --- Ensure repo root is on sys.path ---
REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

print("Repo root:", REPO_ROOT)

# --- Model paths ---
MODEL_DIR = REPO_ROOT / "models"
VEC = MODEL_DIR / "tfidf_vectorizer.joblib"
MODEL = MODEL_DIR / "difficulty_model.joblib"


# -------------------------------------------------------
# STEP 1 — Ensure ML model is trained
# -------------------------------------------------------
try:
    if not VEC.exists() or not MODEL.exists():
        print("\n[ML] Model artifacts missing → running trainer...")
        trainer_script = REPO_ROOT / "src" / "train" / "train_difficulty.py"

        result = subprocess.run(
            [sys.executable, str(trainer_script)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            shell=False
        )

        print(result.stdout)
        if result.returncode != 0:
            print(result.stderr)
            raise RuntimeError("Trainer failed → check output above.")
    else:
        print("[ML] Model artifacts found → skipping trainer.")
except Exception as e:
    print("ERROR during model setup:", e)
    traceback.print_exc()
    raise


# -------------------------------------------------------
# STEP 2 — Test predict_difficulty
# -------------------------------------------------------
try:
    print("\n[ML] Testing predict_difficulty...")
    from src.train.predict_difficulty import predict_difficulty

    label, (classes, probs) = predict_difficulty("What is 2+2?")
    print(" → label:", label)
    print(" → classes:", classes)
    print(" → probs:", probs)
except Exception:
    print("ERROR in predict_difficulty:")
    traceback.print_exc()
    raise


# -------------------------------------------------------
# STEP 3 — Test /ai/from_text using Dummy Gemini model
# -------------------------------------------------------
try:
    print("\n[API] Importing FastAPI app...")
    from fastapi.testclient import TestClient
    from app.main import app
    import app.routers.generate as gen_mod

    print("[API] Monkeypatching Gemini model → using DummyModel...")

    class DummyResponse:
        def __init__(self, text):
            self.text = text
        def __str__(self):
            return self.text

    class DummyModel:
        def __init__(self, *_args, **_kwargs):
            pass
        def generate_content(self, prompt):
            sample = [
                {
                    "question": "What is 2+2?",
                    "distractors": ["1", "2", "3"],
                    "answer": "4",
                    "difficulty": "easy",
                    "explanation": "Test explanation",
                    "topic": "math"
                }
            ]
            raw = "Noise…\n" + json.dumps(sample) + "\nEnd."
            return DummyResponse(raw)

    # Patch google.generativeai.GenerativeModel
    gen_mod.genai.GenerativeModel = DummyModel

    print("[API] Creating TestClient...")
    client = TestClient(app)

    payload = {
        "text": "Simple math text",
        "num_questions": 1,
        "use_structured": False
    }

    print("[API] POST /ai/from_text ...")
    res = client.post("/ai/from_text", json=payload)
    print("Status:", res.status_code)
    print("JSON:", json.dumps(res.json(), indent=2))

    if res.status_code != 200:
        raise RuntimeError(f"/ai/from_text returned {res.status_code}")

except Exception:
    print("ERROR testing /ai/from_text:")
    traceback.print_exc()
    raise


# -------------------------------------------------------
# STEP 4 — Optional PDF test
# -------------------------------------------------------
pdf_path = os.environ.get("SMOKE_TEST_PDF")
if pdf_path:
    try:
        print("\n[PDF] Testing /ai/from_pdf:", pdf_path)
        with open(pdf_path, "rb") as f:
            files = {"file": ("sample.pdf", f, "application/pdf")}
            res = client.post("/ai/from_pdf?num_questions=1", files=files)
            print("Status:", res.status_code)
            print("JSON:", res.text)
    except Exception:
        print("ERROR during PDF test:")
        traceback.print_exc()
        raise
else:
    print("\n[PDF] Skipped — set SMOKE_TEST_PDF=C:/path/file.pdf to test.")

print("\n✔ ALL SMOKE TESTS PASSED on Windows ✔")
