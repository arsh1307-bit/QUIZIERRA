# tools/compute_embeddings_tfidf.py
"""
Compute "embeddings" for each question using the saved TF-IDF vectorizer
and store them into the questions.embedding column (JSON text).
Safe to run multiple times (skips rows that already have embeddings).
Run as: python -m tools.compute_embeddings_tfidf
"""

import os
import json
import sys
from pathlib import Path

# ensure project root is importable when run as module
ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from src.adaptive.engine import get_connection
import joblib
import numpy as np

VEC_PATH = Path("models/tfidf_vectorizer.joblib")

def load_vectorizer():
    if not VEC_PATH.exists():
        raise FileNotFoundError(f"Vectorizer not found at {VEC_PATH}. Run training first.")
    vec = joblib.load(VEC_PATH)
    return vec

def main():
    vec = load_vectorizer()
    con = get_connection()
    cur = con.cursor()
    cur.execute("SELECT rowid, question, embedding FROM questions")
    rows = cur.fetchall()
    print(f"Found {len(rows)} question rows.")
    updated = 0
    for rowid, question, emb_field in rows:
        # skip if embedding already exists and is non-empty
        if emb_field is not None and str(emb_field).strip() != "":
            continue
        text = (question or "")[:2000]
        try:
            X = vec.transform([text])  # sparse matrix (1 x D)
            arr = X.toarray()[0].astype(float).tolist()  # dense list
            cur.execute("UPDATE questions SET embedding = ? WHERE rowid = ?", (json.dumps(arr, ensure_ascii=False), rowid))
            updated += 1
            if updated % 10 == 0:
                con.commit()
                print(f"Committed {updated} embeddings...")
        except Exception as e:
            print("Failed embedding for rowid", rowid, ":", e)
    con.commit()
    con.close()
    print("TF-IDF embedding complete. Updated:", updated)

if __name__ == "__main__":
    main()
