Quizierra is a next-generation adaptive learning platform designed to break the cycle of static, one-
size-fits-all exam preparation. By integrating Large Language Models (LLMs) with reinforced learning
loops, Quizierra dynamically generates questions, semantically evaluates subjective answers, and
gamifies the learning process through a unique “car-building” reward system

Contents : 
1. Problem Statement
2. Solution & Key Features
3. System Architecture
4. Tech Stack & Dependencies
5. Installation & Setup
6. API Documentation
7. Example Inputs/Outputs
8. Contributors

Problem Statement :
Students preparing for competitive exams today suffer from:
• Static Content: Lack of dynamically generated, context-relevant questions.
• No Adaptation: Difficulty levels do not evolve with the user’s performance.
• Weak Analytics: Absence of deep diagnostic insights (e.g., conceptual vs. careless errors).
• Low Engagement: Boring interfaces lead to low retention and motivation.
Quizierra resolves this by creating a personalized learning loop that improves with every attempt.

Solution & Key Features : 
1. Adaptive Intelligence
Dynamic difficulty progression based on a performance vector: (Accuracy × Speed × Stability).
The system adjusts topic weights and difficulty in real-time.
2. Hybrid Semantic Evaluation
Unlike traditional platforms that only check MCQs, Quizierra uses NLP (BERT-lite + TF-IDF) to grade
subjective text answers based on semantic similarity to model answers.
3. Gamified Reward System
Performance isn’t just a number. It’s a vehicle.
• Correct Answers: Earn basic parts (Chassis, Wheels).
• High Difficulty: Unlocks upgrades (V8 Engine, Turbo).
• Consistency: Unlocks aesthetics (Paint jobs, Rims).
4. Deep Analytics
Mathongo-grade insights visualizing Speed profiling, Error pattern classification, and Topic-wise
strength heatmaps.

System Architecture :
Quizierra adopts a three-tier architecture with strict separation of concerns.
User ( Client ) --> [ Frontend : React / Vite ]
|
v
[ Backend : FastAPI / Node . js ] --> [ AI Engine ]
| - - > Question Generator ( LLM )
| - - > Semantic Evaluator
| - - > Adaptive Engine
|
v
[ Database : P os tgr eS QL / MongoDB ]

Tech Stack & Dependencies :
Frontend
• Framework: React.js (Vite)
• Styling: Tailwind CSS
• Visualization: Recharts (Analytics)
Backend & AI
• Server: FastAPI (Python) or Node.js (Express)
• LLM Integration: LangChain / OpenAI API
• NLP: Sentence-Transformers (BERT), NLTK
• Database: PostgreSQL / MongoDB

Installation & Setup :
Prerequisites
Node.js (v18+), Python (v3.9+), MongoDB/PostgreSQL instance, API Keys.
1. Clone Repository
git clone https://github.com/arsh1307-bit/QUIZIERRA
cd quizierra
2. Backend Setup
cd backend
python -m venv venv
source venv / bin / activate # Windows : venv \ Scripts \ activate
pip install -r r e q u i r e m e n t s . txt
cp . env . example . env
3. Frontend Setup
cd ../frontend
npm install
npm run dev

API Documentation :
1. Generate Quiz
POST /api/v1/quiz/generate
{
"topic": "Thermodynamics" ,
"difficulty": "Medium" ,
"mode": "adaptive"
}
2. Submit & Evaluate
POST /api/v1/quiz/submit
{
" quiz_id ": "qz_9988" ,
" responses ": [
{ "q_id": 1 , "answer": "B" , "time": 12 } ,
{ "q_id": 2 , "text_answer": "Entropy is the measure of disorder." }
]
}

Contributors :
Quizierra was architected and developed by:
• Abhinav Gupta
• Arshpreet Sukhdeep Singh Dhillon
• Tejas Patil
