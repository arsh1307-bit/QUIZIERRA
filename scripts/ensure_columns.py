import sqlite3

p = "data/adaptive.db"
con = sqlite3.connect(p)
cur = con.cursor()

cols = [r[1] for r in cur.execute("PRAGMA table_info(questions)").fetchall()]
print("Columns BEFORE:", cols)

# Add missing columns one by one
missing = []

def add(colname, coldef):
    if colname not in cols:
        cur.execute(f"ALTER TABLE questions ADD COLUMN {colname} {coldef}")
        missing.append(colname)

add("answer", "TEXT")
add("distractors", "TEXT")
add("topic", "TEXT")
add("explanation", "TEXT")

con.commit()
con.close()

print("Added:", missing if missing else "Nothing (already exists)")
