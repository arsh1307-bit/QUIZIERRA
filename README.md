<<<<<<< HEAD
Development notes — start backend and frontend

1) Install Python requirements (create and activate virtualenv recommended):

=======
# Quizierra - AI-Powered Learning Platform

Quizierra is an adaptive learning platform that combines AI-powered quiz generation with personalized learning paths for students and comprehensive analytics for teachers.

## 🚀 Quick Start

See **[SETUP.md](./SETUP.md)** for complete setup instructions.

### Quick Run (Two Terminals)

**Terminal 1 - Backend:**
>>>>>>> aac9a39ab4330529467a62387a99c804cd32ffbe
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
<<<<<<< HEAD
```

2) Start the Python backend (FastAPI / Uvicorn):

```powershell
# from repo root
npm run backend:start
# or
.\scripts\start-backend.ps1
```

3) In a second terminal, install node deps and start Next dev:

=======
npm run backend:start
```

**Terminal 2 - Frontend:**
>>>>>>> aac9a39ab4330529467a62387a99c804cd32ffbe
```powershell
npm install
npm run dev
```

<<<<<<< HEAD
Notes:
- The Next.js API route `/api/generate-quiz` proxies to the Python endpoint at `http://127.0.0.1:8000/ai/from_text` by default. You can change the base URL by setting `PYTHON_AI_BASE` in your environment.
- Ensure `GEMINI_API_KEY` and optionally `GEMINI_MODEL` are set in your `.env` file (project root) for the Python code to call Gemini.
- If the Python service is unreachable, the API will return deterministic fallback quiz items so the UI remains usable.
=======
Then open: **http://localhost:9002**

## 📋 Prerequisites

- Node.js (v18+)
- Python (v3.8+)
- Firebase Account
- Google Gemini API Key

## 🔑 Environment Setup

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-pro
```

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup guide
- **[docs/TEACHER_EXPERIENCE_V1.md](./docs/TEACHER_EXPERIENCE_V1.md)** - Teacher features
- **[docs/FUTURE_CONSIDERATIONS.md](./docs/FUTURE_CONSIDERATIONS.md)** - Future enhancements

## 🎯 Features

- **Student Experience:**
  - Upload study materials (PDF, DOCX, Text)
  - Review AI-generated key concepts
  - Take adaptive quizzes
  - Track progress and weak areas
  - Practice mode for improvement

- **Teacher Experience:**
  - Create and manage classes
  - Generate quizzes from materials
  - Assign quizzes to students
  - View concept-level analytics
  - Track individual student progress

## 🛠️ Tech Stack

- **Frontend:** Next.js 16, React, TypeScript, Tailwind CSS
- **Backend:** Python FastAPI, Uvicorn
- **Database:** Firebase Firestore
- **AI:** Google Gemini API
- **Authentication:** Firebase Auth

## 📖 Notes

- The Next.js API route `/api/generate-quiz` proxies to the Python endpoint at `http://127.0.0.1:8000/ai/from_text` by default.
- Ensure `GEMINI_API_KEY` is set in your `.env` file for AI features.
- Backend runs on port 8000, frontend on port 9002.
>>>>>>> aac9a39ab4330529467a62387a99c804cd32ffbe
