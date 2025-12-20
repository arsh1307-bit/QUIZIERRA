# app/services/difficulty_service.py
from pathlib import Path
import joblib
from app.config import MODEL_DIR

VEC_PATH = Path(MODEL_DIR) / "tfidf_vectorizer.joblib"
MODEL_PATH = Path(MODEL_DIR) / "difficulty_model.joblib"

class DifficultyService:
    def __init__(self):
        self.vec = None
        self.model = None
        self.load()

    def load(self):
        try:
            self.vec = joblib.load(VEC_PATH)
            self.model = joblib.load(MODEL_PATH)
        except Exception as e:
            # leave as None if not found
            self.vec = None
            self.model = None
            self.load_err = str(e)

    def predict(self, question: str):
        if self.model is None or self.vec is None:
            raise RuntimeError(f"Model not loaded: {getattr(self,'load_err', 'missing')}")
        q = question if isinstance(question, str) else str(question)
        qv = self.vec.transform([q])
        pred = self.model.predict(qv)[0]
        probs = self.model.predict_proba(qv).tolist()[0] if hasattr(self.model, "predict_proba") else None
        classes = self.model.classes_.tolist() if hasattr(self.model, "classes_") else None
        return {"difficulty": pred, "probs": probs, "classes": classes}
