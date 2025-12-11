# src/adaptive/db_migrations.py
"""
One-off safe DB migration for Quizierra adaptive features.

Adds:
 - questions.embedding (TEXT)
 - questions.gemini_difficulty (TEXT)
 - gemini_prob_cache table
 - interactions table

Run this script once (or re-run safely).
"""

import sqlite3
from src.adaptive.engine import get_connection  # reuse your existing DB connector
import json

def safe_alter_questions(con):
    cur = con.cursor()
    cur.execute("PRAGMA table_info(questions)")
    cols = [row[1] for row in cur.fetchall()]

    if "embedding" not in cols:
        cur.execute("ALTER TABLE questions ADD COLUMN embedding TEXT")
        print("Added column: questions.embedding")
    else:
        print("Column already exists: questions.embedding")

    if "gemini_difficulty" not in cols:
        cur.execute("ALTER TABLE questions ADD COLUMN gemini_difficulty TEXT")
        print("Added column: questions.gemini_difficulty")
    else:
        print("Column already exists: questions.gemini_difficulty")

    con.commit()

def create_aux_tables(con):
    cur = con.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS gemini_prob_cache (
        user_id TEXT,
        question_id INTEGER,
        prob REAL,
        ts DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("Ensured table: gemini_prob_cache")

    cur.execute("""
    CREATE TABLE IF NOT EXISTS interactions (
        user_id TEXT,
        question_id INTEGER,
        is_correct INTEGER,
        ts DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("Ensured table: interactions")

    con.commit()

def run_migrations():
    con = get_connection()
    try:
        safe_alter_questions(con)
        create_aux_tables(con)
    finally:
        con.close()
    print("Migrations finished.")

if __name__ == "__main__":
    run_migrations()
