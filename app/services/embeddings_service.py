# app/services/embeddings_service.py
from sentence_transformers import SentenceTransformer
import joblib
from pathlib import Path
from app.config import MODEL_DIR

EMB_NAME = "all-MiniLM-L6-v2"

class EmbeddingService:
    def __init__(self, model_name=EMB_NAME):
        self.model = SentenceTransformer(model_name)

    def encode(self, texts, show_progress=False):
        return self.model.encode(texts, show_progress_bar=show_progress)
