# Quizierra - AI-Powered Learning Platform

Quizierra is an adaptive learning platform that combines AI-powered quiz generation with personalized learning paths for students and comprehensive analytics for teachers.

## 🚀 Quick Start

See **[SETUP.md](./SETUP.md)** for complete setup instructions.

### Quick Run (Two Terminals)

**Terminal 1 - Backend:**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
npm run backend:start
```

**Terminal 2 - Frontend:**
```powershell
npm install
npm run dev
```

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
