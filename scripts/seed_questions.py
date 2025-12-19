from src.adaptive.engine import get_connection

questions = [
    ("What is 2+2?", "easy"),
    ("Define photosynthesis.", "medium"),
    ("Explain backpropagation.", "hard"),
]

con = get_connection()
cur = con.cursor()
cur.executemany("INSERT INTO questions (question, difficulty) VALUES (?, ?)", questions)
con.commit()
print("Seeded sample questions!")
