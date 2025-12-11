# src/train/train_difficulty.py
"""
Train a TF-IDF + Logistic Regression difficulty classifier.

Usage:
    python src/train/train_difficulty.py

If data/data/labeled/questions_small.csv exists with columns (question,difficulty)
it will be used; otherwise a synthetic dataset is created (toy).
Saves:
    models/tfidf_vectorizer.joblib
    models/difficulty_model.joblib
"""
import os
from pathlib import Path
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data" / "labeled"
DATA_PATH = DATA_DIR / "questions_small.csv"
MODEL_DIR = ROOT / "models"


def make_toy_dataset():
    easy = [f"What is 2 + 2? (easy {i})" for i in range(100)]
    medium = [f"Explain how photosynthesis works. (medium {i})" for i in range(100)]
    hard = [f"Derive the backpropagation gradient for a neural network. (hard {i})" for i in range(100)]

    q = easy + medium + hard
    d = ["easy"] * 100 + ["medium"] * 100 + ["hard"] * 100

    df = pd.DataFrame({"question": q, "difficulty": d})
    return df.sample(frac=1, random_state=42).reset_index(drop=True)


def load_data():
    # If CSV exists but is empty → ignore it
    if DATA_PATH.exists():
        print(f"Loading CSV from {DATA_PATH}")
        try:
            df = pd.read_csv(DATA_PATH)
            # If CSV exists but has NO rows or NO required columns
            if df.empty or "question" not in df.columns or "difficulty" not in df.columns:
                print("CSV is empty or missing required columns — using synthetic dataset instead.")
                return make_toy_dataset()
            return df
        except Exception as e:
            print("CSV failed to load:", e)
            print("Using synthetic dataset instead.")
            return make_toy_dataset()
    else:
        print("CSV NOT FOUND — using synthetic dataset instead.")
        return make_toy_dataset()


def train():
    df = load_data()
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    X = df["question"].astype(str)
    y = df["difficulty"].astype(str)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    print("Training TF-IDF vectorizer...")
    vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
    Xv_train = vectorizer.fit_transform(X_train)
    Xv_test = vectorizer.transform(X_test)

    print("Training classifier...")
    model = LogisticRegression(max_iter=2000, class_weight="balanced")
    model.fit(Xv_train, y_train)

    print("\n--- EVALUATION (on test set) ---\n")
    preds = model.predict(Xv_test)
    print(classification_report(y_test, preds))

    print("Saving vectorizer...")
    joblib.dump(vectorizer, MODEL_DIR / "tfidf_vectorizer.joblib")

    print("Saving model...")
    joblib.dump(model, MODEL_DIR / "difficulty_model.joblib")

    print("DONE — Models saved to", MODEL_DIR)


if __name__ == "__main__":
    train()
