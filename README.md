QUIZIERRA
AI-Powered Adaptive Assessment & Learning Ecosystem
MIT License • Active Status • Stack: MERN / FastAPI
Quizierra is a next-generation adaptive learning platform designed to break the cycle of static, onesize-fits-all exam preparation. By integrating Large Language Models (LLMs) with reinforced learning
loops, Quizierra dynamically generates questions, semantically evaluates subjective answers, and
gamifies the learning process through a unique “car-building” reward system.
Contents
1 Problem Statement 1
2 Solution & Key Features 2
3 System Architecture 2
4 Tech Stack & Dependencies 2
5 Installation & Setup 3
6 API Documentation 3
7 Example Inputs/Outputs 4
8 Contributors 4
Problem Statement
Students preparing for competitive exams today suffer from:
• Static Content: Lack of dynamically generated, context-relevant questions.
• No Adaptation: Difficulty levels do not evolve with the user’s performance.
• Weak Analytics: Absence of deep diagnostic insights (e.g., conceptual vs. careless errors).
• Low Engagement: Boring interfaces lead to low retention and motivation.
Quizierra resolves this by creating a personalized learning loop that improves with every attempt.
1
Solution & Key Features
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
System Architecture
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
[ Database : PostgreSQL / MongoDB ]
Listing 1: Architecture Flow
Tech Stack & Dependencies
Frontend
• Framework: React.js (Vite)
• Styling: Tailwind CSS
• Visualization: Recharts (Analytics)
2
Backend & AI
• Server: FastAPI (Python) or Node.js (Express)
• LLM Integration: LangChain / OpenAI API
• NLP: Sentence-Transformers (BERT), NLTK
• Database: PostgreSQL / MongoDB
Installation & Setup
Prerequisites
Node.js (v18+), Python (v3.9+), MongoDB/PostgreSQL instance, API Keys.
1. Clone Repository
git clone https :// github . com / your - username / quizierra . git
cd quizierra
2. Backend Setup
cd backend
python -m venv venv
source venv / bin / activate # Windows : venv \ Scripts \ activate
pip install -r requirements . txt
cp . env . example . env
3. Frontend Setup
cd ../ frontend
npm install
npm run dev
API Documentation
1. Generate Quiz
POST /api/v1/quiz/generate
{
" topic ": " Thermodynamics " ,
" difficulty ": " Medium " ,
" mode ": " adaptive "
}
3
2. Submit & Evaluate
POST /api/v1/quiz/submit
{
" quiz_id ": " qz_9988 " ,
" responses ": [
{ " q_id ": 1 , " answer ": " B" , " time ": 12 },
{ " q_id ": 2 , " text_answer ": " Entropy is the measure of disorder ." }
]
}
Example Inputs/Outputs
Input (Adaptive Engine): User answers 3 “Hard” questions correctly but takes 2x expected time.
Output Decision:
{
" next_difficulty ": " Medium - Hard " ,
" adjustment_reason ": " Accuracy high , but speed suggests cognitive load
limit reached ." ,
" recommended_focus ": " Speed drills "
}
Contributors
Quizierra was architected and developed by:
• Abhinav Gupta
• Arshpreet Sukhdeep Singh Dhillon
• Tejas Patil
"Building the future of personalized education, one adaptive quiz at a time."
4
