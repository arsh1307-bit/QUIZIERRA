# src/adaptive/engine.py
import random
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta
import math
import os, json

DB_PATH = Path(__file__).resolve().parents[2] / "data" / "adaptive.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# Difficulty ratings (ELO-style)
DIFFICULTY_RATINGS = {
    "easy": 800,
    "medium": 1200,
    "hard": 1600,
}

K = 32  # skill update speed
DEFAULT_TARGET_P = 0.7
DEFAULT_EXCLUDE_LAST_N = 20

def get_connection():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con

def create_tables():
    con = get_connection()
    cur = con.cursor()

    # user skill table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_skill (
            user_id TEXT PRIMARY KEY,
            skill INTEGER DEFAULT 1000,
            last_updated TEXT
        )
    """)

    # question bank
    cur.execute("""
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT,
            difficulty TEXT,
            metadata TEXT
        )
    """)

    # answer history (used for avoiding repeats and analytics)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            question_id INTEGER,
            is_correct INTEGER,
            ts TEXT DEFAULT (datetime('now'))
        )
    """)

    con.commit()
    con.close()

def get_user_skill(user_id: str):
    con = get_connection()
    cur = con.cursor()
    cur.execute("SELECT skill FROM user_skill WHERE user_id=?", (user_id,))
    row = cur.fetchone()

    if row:
        return row["skill"]

    # If user does not exist, create new default skill = 1000
    cur.execute("INSERT INTO user_skill (user_id, skill, last_updated) VALUES (?, ?, ?)", (user_id, 1000, datetime.utcnow().isoformat()))
    con.commit()
    con.close()
    return 1000

def update_user_skill(user_id: str, question_difficulty: str, is_correct: bool):
    skill = get_user_skill(user_id)
    q_rating = DIFFICULTY_RATINGS.get(question_difficulty, 1200)

    # compute expected & actual score
    expected = 1 / (1 + 10 ** ((q_rating - skill) / 400))
    actual = 1 if is_correct else 0

    new_skill = int(skill + K * (actual - expected))

    # update DB
    con = get_connection()
    cur = con.cursor()
    cur.execute("UPDATE user_skill SET skill=?, last_updated=? WHERE user_id=?", (new_skill, datetime.utcnow().isoformat(), user_id))
    # record in history (question_id unknown here; caller should also insert history record separately if desired)
    con.commit()
    con.close()

    return new_skill, expected, actual

def record_interaction(user_id: str, question_id: int, is_correct: bool):
    """Insert an interaction row into history (call from router when recording answers)."""
    con = get_connection()
    cur = con.cursor()
    cur.execute("INSERT INTO history (user_id, question_id, is_correct, ts) VALUES (?, ?, ?, ?)", (user_id, question_id, int(is_correct), datetime.utcnow().isoformat()))
    con.commit()
    con.close()

def predict_success_prob(user_skill: float, q_diff_rating: float):
    """Return predicted probability user succeeds on a question with rating q_diff_rating."""
    # use logistic-style ELO probability
    # p = 1 / (1 + 10^((q - s)/400))
    try:
        p = 1.0 / (1.0 + 10 ** ((q_diff_rating - user_skill) / 400.0))
    except OverflowError:
        # handle extreme values
        if q_diff_rating - user_skill > 0:
            p = 0.0
        else:
            p = 1.0
    return p

def _get_recent_question_ids(user_id: str, limit: int = DEFAULT_EXCLUDE_LAST_N):
    """Return list of most recent question_ids seen by user (most recent first)."""
    con = get_connection()
    cur = con.cursor()
    cur.execute("SELECT question_id FROM history WHERE user_id=? ORDER BY id DESC LIMIT ?", (user_id, limit))
    rows = cur.fetchall()
    con.close()
    return [r["question_id"] for r in rows if r["question_id"] is not None]

def get_next_question(user_id: str, allowed_ids=None, target_p: float = DEFAULT_TARGET_P, exclude_last_n: int = DEFAULT_EXCLUDE_LAST_N):
    """
    Select the next question for a user:
    - exclude recent questions for that user (last `exclude_last_n`)
    - if allowed_ids provided, restrict to them
    - choose the question whose predicted success probability is closest to target_p
    Returns a dict: {question_id, question_text, difficulty, predicted_prob, user_skill}
    """
    user_skill = get_user_skill(user_id)

    con = get_connection()
    cur = con.cursor()

    # Build base query
    if allowed_ids:
        placeholders = ",".join("?" for _ in allowed_ids)
        q = f"SELECT id, question, difficulty, metadata FROM questions WHERE id IN ({placeholders})"
        params = tuple(allowed_ids)
    else:
        q = "SELECT id, question, difficulty, metadata FROM questions"
        params = ()

    cur.execute(q, params)
    rows = cur.fetchall()
    con.close()

    if not rows:
        return None

    recent_ids = set(_get_recent_question_ids(user_id, limit=exclude_last_n))

    # Filter out recent questions
    candidates = [r for r in rows if r["id"] not in recent_ids]

    # If all questions were filtered out (small DB), fallback to all rows
    if not candidates:
        candidates = rows

    # Compute predicted probability for each candidate and pick closest to target
    best = None
    best_score = None
    for r in candidates:
        qid = r["id"]
        diff_label = r["difficulty"]
        q_rating = DIFFICULTY_RATINGS.get(diff_label, 1200)
        p = predict_success_prob(user_skill, q_rating)
        score = -abs(p - target_p)  # higher is better (closer to target)
        if best is None or score > best_score:
            best = r
            best_score = score
            best_p = p

    # Return a compact dict
    out = {
        "question_id": best["id"],
        "question": best["question"],
        "difficulty": best["difficulty"],
        "predicted_success_prob": float(best_p),
        "user_skill": user_skill
    }
    return out
