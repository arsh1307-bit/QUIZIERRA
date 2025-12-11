import sqlite3

p = 'data/adaptive.db'
con = sqlite3.connect(p)
cur = con.cursor()

cols = [r[1] for r in cur.execute("PRAGMA table_info(questions)").fetchall()]
print("COLUMNS BEFORE:", cols)

if 'metadata' not in cols:
    cur.execute("ALTER TABLE questions ADD COLUMN metadata TEXT")
    con.commit()
    print("Added column 'metadata' to questions table")
else:
    print("'metadata' column already exists")

con.close()
