# app/services/adaptive_engine.py
import sqlite3
from pathlib import Path
from app.config import DATA_DIR
from datetime import datetime
import math
import os
import json
import threading

# Use a thread-local storage for the database connection
local = threading.local()

DB_PATH = Path(DATA_DIR) / "adaptive.db"
Path(DATA_DIR).mkdir(parents=True, exist_ok=True)

# Hyperparameters
SCALE = 1.0
K_USER = 0.3
K_Q = 0.1
MIN_SKILL, MAX_SKILL = -6.0, 6.0
MIN_DIFF, MAX_DIFF = -6.0, 6.0


def get_connection():
    """Get a thread-local SQLite connection."""
    if not hasattr(local, "conn"):
        local.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    return local.conn


def close_connection(exception=None):
    """Close the thread-local SQLite connection."""
    if hasattr(local, "conn"):
        local.conn.close()
        del local.conn


def init_db():
    """Initialize database tables if they don't exist."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS users (user_hash TEXT PRIMARY KEY, skill REAL, last_updated TEXT)")
    cur.execute("CREATE TABLE IF NOT EXISTS questions (question_id TEXT PRIMARY KEY, difficulty TEXT, text TEXT, metadata TEXT)")
    cur.execute("CREATE TABLE IF NOT EXISTS interactions (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, user_hash TEXT, question_id TEXT, correct INTEGER, response_time_ms INTEGER, user_skill_before REAL, question_diff_before REAL)")
    conn.commit()


# Initialize the DB schema on module load
init_db()


def sigmoid(x):
    return 1.0 / (1.0 + math.exp(-x))


def predict_prob(user_skill, q_diff):
    return sigmoid((user_skill - q_diff) / SCALE)


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def ensure_user(user_hash: str) -> float:
    """Ensure a user exists in the DB, creating if not. Returns current skill."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT skill FROM users WHERE user_hash = ?", (user_hash,))
    row = cur.fetchone()
    if row is None:
        skill = 0.0
        cur.execute("INSERT INTO users (user_hash, skill, last_updated) VALUES (?, ?, ?)",
                    (user_hash, skill, datetime.utcnow().isoformat()))
        conn.commit()
        return skill
    return row[0]


def ensure_question(qid: str, text: str = None, initial_difficulty: str = 'medium') -> str:
    """Ensure a question exists, creating if not. Returns current difficulty."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT difficulty FROM questions WHERE question_id = ?", (qid,))
    row = cur.fetchone()
    if row is None:
        cur.execute("INSERT INTO questions (question_id, difficulty, text, metadata) VALUES (?, ?, ?, ?)",
                    (qid, initial_difficulty, text or "", json.dumps({})))
        conn.commit()
        return initial_difficulty
    return row[0]


def record_answer(user_hash: str, question_id: str, correct: int, response_time_ms: int = None):
    """Record a user's answer and update skill/difficulty models."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Get current skill and difficulty
        user_skill = ensure_user(user_hash)
        q_diff = ensure_question(question_id)

        # IRT model update
        p = predict_prob(user_skill, q_diff)
        observed = 1.0 if correct else 0.0
        delta_user = K_USER * (observed - p)
        new_skill = clamp(user_skill + delta_user, MIN_SKILL, MAX_SKILL)
        delta_q = -K_Q * (observed - p)
        new_q = clamp(q_diff + delta_q, MIN_DIFF, MAX_DIFF)

        # Record interaction
        cur.execute(
            "INSERT INTO interactions (ts,user_hash,question_id,correct,response_time_ms,user_skill_before,question_diff_before) VALUES (?,?,?,?,?,?,?)",
            (datetime.utcnow().isoformat(), user_hash, question_id, correct, response_time_ms, user_skill, q_diff)
        )
        # Update user and question records
        cur.execute("UPDATE users SET skill = ?, last_updated = ? WHERE user_hash = ?",
                    (new_skill, datetime.utcnow().isoformat(), user_hash))
        cur.execute("UPDATE questions SET difficulty = ? WHERE question_id = ?", (new_q, question_id))

        conn.commit()
        return {
            "user_hash": user_hash,
            "skill_before": user_skill,
            "skill_after": new_skill,
            "question_before": q_diff,
            "question_after": new_q,
            "predicted_prob_before": p
        }
    except sqlite3.Error:
        conn.rollback()
        raise


def next_question_for_user(user_hash: str, allowed_ids: list = None, current_difficulty: str = 'medium', last_was_correct: bool = None):
    """Select the most appropriate next question for a user based on difficulty."""
    conn = get_connection()
    cur = conn.cursor()

    # Determine next difficulty
    if last_was_correct is None: # First question
        next_difficulty = 'medium'
    elif last_was_correct:
        if current_difficulty == 'easy':
            next_difficulty = 'medium'
        else:
            next_difficulty = 'hard'
    else: # Incorrect
        if current_difficulty == 'hard':
            next_difficulty = 'medium'
        else:
            next_difficulty = 'easy'

    # Fetch a question with the determined difficulty
    if allowed_ids:
        placeholders = ",".join("?" for _ in allowed_ids)
        query = f"SELECT question_id, difficulty, text FROM questions WHERE difficulty = ? AND question_id IN ({placeholders})"
        params = (next_difficulty,) + tuple(allowed_ids)
    else:
        query = "SELECT question_id, difficulty, text FROM questions WHERE difficulty = ?"
        params = (next_difficulty,)

    cur.execute(query, params)
    row = cur.fetchone()

    if row:
        qid, qdiff, qtext = row
        return {
            "question_id": qid,
            "text_preview": qtext[:500] if qtext else "",
            "difficulty": qdiff,
        }
    return None # Or handle case where no question of the desired difficulty is found
