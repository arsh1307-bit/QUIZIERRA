# app/services/adaptive_engine.py
import sqlite3
from pathlib import Path
from app.config import DATA_DIR
from datetime import datetime
import math, os, json

DB_PATH = Path(DATA_DIR) / "adaptive.db"
Path(DATA_DIR).mkdir(parents=True, exist_ok=True)

# hyperparams
SCALE = 1.0
K_USER = 0.3
K_Q = 0.1
MIN_SKILL, MAX_SKILL = -6.0, 6.0
MIN_DIFF, MAX_DIFF = -6.0, 6.0

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS users (user_hash TEXT PRIMARY KEY, skill REAL, last_updated TEXT)""")
    cur.execute("""CREATE TABLE IF NOT EXISTS questions (question_id TEXT PRIMARY KEY, difficulty REAL, text TEXT, metadata TEXT)""")
    cur.execute("""CREATE TABLE IF NOT EXISTS interactions (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, user_hash TEXT, question_id TEXT, correct INTEGER, response_time_ms INTEGER, user_skill_before REAL, question_diff_before REAL)""")
    conn.commit()
    conn.close()

def sigmoid(x):
    return 1.0 / (1.0 + math.exp(-x))

def predict_prob(user_skill, q_diff):
    return sigmoid((user_skill - q_diff) / SCALE)

def clamp(v, lo, hi): return max(lo, min(hi, v))

def ensure_user(user_hash):
    conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
    cur.execute("SELECT skill FROM users WHERE user_hash = ?", (user_hash,))
    row = cur.fetchone()
    if row is None:
        cur.execute("INSERT INTO users (user_hash, skill, last_updated) VALUES (?, ?, ?)", (user_hash, 0.0, datetime.utcnow().isoformat()))
        conn.commit(); conn.close()
        return 0.0
    conn.close(); return row[0]

def ensure_question(qid, text=None, initial=0.0):
    conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
    cur.execute("SELECT difficulty FROM questions WHERE question_id = ?", (qid,))
    row = cur.fetchone()
    if row is None:
        cur.execute("INSERT INTO questions (question_id, difficulty, text, metadata) VALUES (?, ?, ?, ?)", (qid, initial, text or "", json.dumps({})))
        conn.commit(); conn.close()
        return initial
    conn.close(); return row[0]

def record_answer(user_hash, question_id, correct:int, response_time_ms=None):
    # init db
    ensure_user(user_hash); ensure_question(question_id)
    conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
    cur.execute("SELECT skill FROM users WHERE user_hash = ?", (user_hash,))
    user_skill = cur.fetchone()[0]
    cur.execute("SELECT difficulty FROM questions WHERE question_id = ?", (question_id,))
    q_diff = cur.fetchone()[0]
    p = predict_prob(user_skill, q_diff)
    observed = 1.0 if correct else 0.0
    delta_user = K_USER * (observed - p)
    new_skill = clamp(user_skill + delta_user, MIN_SKILL, MAX_SKILL)
    delta_q = -K_Q * (observed - p)
    new_q = clamp(q_diff + delta_q, MIN_DIFF, MAX_DIFF)
    cur.execute("UPDATE users SET skill = ?, last_updated = ? WHERE user_hash = ?", (new_skill, datetime.utcnow().isoformat(), user_hash))
    cur.execute("UPDATE questions SET difficulty = ? WHERE question_id = ?", (new_q, question_id))
    cur.execute("INSERT INTO interactions (ts,user_hash,question_id,correct,response_time_ms,user_skill_before,question_diff_before) VALUES (?,?,?,?,?,?,?)", (datetime.utcnow().isoformat(), user_hash, question_id, correct, response_time_ms, user_skill, q_diff))
    conn.commit(); conn.close()
    return {"user_hash": user_hash, "skill_before": user_skill, "skill_after": new_skill, "question_before": q_diff, "question_after": new_q, "predicted_prob_before": p}

def next_question_for_user(user_hash, allowed_ids=None, target_p=0.7):
    ensure_user(user_hash)
    conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
    if allowed_ids:
        placeholders = ",".join("?" for _ in allowed_ids)
        q = f"SELECT question_id,difficulty,text FROM questions WHERE question_id IN ({placeholders})"
        cur.execute(q, tuple(allowed_ids))
    else:
        cur.execute("SELECT question_id,difficulty,text FROM questions")
    rows = cur.fetchall()
    conn.close()
    if not rows:
        return None
    # compute closeness to target prob
    user_skill = ensure_user(user_hash)
    best=None; best_score=None
    for qid, qdiff, qtext in rows:
        p = predict_prob(user_skill, qdiff)
        score = -abs(p - target_p)
        if best is None or score > best_score:
            best = (qid,qdiff,qtext,p); best_score=score
    qid,qdiff,qtext,p = best
    return {"question_id": qid, "text_preview": qtext[:500], "question_difficulty_score": qdiff, "predicted_success_prob": p, "user_skill": user_skill}
