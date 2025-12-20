# 🚀 Quizierra Setup & Run Guide

Complete guide to set up and run the Quizierra application locally.

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download](https://www.python.org/downloads/)
- **npm** (comes with Node.js)
- **Firebase Account** (for database and authentication)
- **Google Gemini API Key** (for AI features) - [Get API Key](https://makersuite.google.com/app/apikey)

---

## 🔧 Step 1: Clone & Install Dependencies

### 1.1 Install Node.js Dependencies

```powershell
# Install all npm packages
npm install
```

### 1.2 Set Up Python Environment

```powershell
# Create virtual environment (recommended)
python -m venv .venv

# Activate virtual environment
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1

# On Windows CMD:
# .venv\Scripts\activate.bat

# On Mac/Linux:
# source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

---

## 🔑 Step 2: Configure Environment Variables

Create a `.env` file in the project root directory:

```powershell
# Create .env file
New-Item .env
```

Add the following variables to `.env`:

```env
# Google Gemini API Key (Required for AI features)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-pro

# Optional: OpenAI API Key (for backwards compatibility)
# OPENAI_API_KEY=your_openai_key_here

# Optional: Python Backend Port (default: 8000)
# PORT=8000

# Optional: Python AI Base URL (default: http://127.0.0.1:8000)
# PYTHON_AI_BASE=http://127.0.0.1:8000
```

**Important:** Replace `your_gemini_api_key_here` with your actual Gemini API key.

---

## 🔥 Step 3: Firebase Configuration

The Firebase configuration is already set in `firebase/config.ts`. If you need to use your own Firebase project:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable **Authentication** (Email/Password, Google)
4. Enable **Firestore Database**
5. Update `firebase/config.ts` with your project credentials

---

## 🚀 Step 4: Run the Application

You need **two terminal windows** - one for the backend and one for the frontend.

### Terminal 1: Start Python Backend

```powershell
# Make sure virtual environment is activated
.\.venv\Scripts\Activate.ps1

# Start the FastAPI backend
npm run backend:start

# OR use the PowerShell script directly:
.\scripts\start-backend.ps1
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### Terminal 2: Start Next.js Frontend

```powershell
# In a new terminal (keep backend running)
npm run dev
```

You should see:
```
✓ Ready in X seconds
○ Local:        http://localhost:9002
```

---

## 🌐 Step 5: Access the Application

Open your browser and navigate to:

**Frontend:** http://localhost:9002

The application should now be running!

---

## ✅ Verify Installation

1. **Backend Health Check:**
   - Visit: http://127.0.0.1:8000/health
   - Should return: `{"status": "ok"}`

2. **Frontend:**
   - Visit: http://localhost:9002
   - Should see the Quizierra landing page

3. **Test Signup:**
   - Click "Sign Up"
   - Create a test account (Student or Teacher)
   - Complete onboarding

---

## 🎯 Quick Start Commands

### Start Everything (Two Terminals)

**Terminal 1:**
```powershell
.\.venv\Scripts\Activate.ps1
npm run backend:start
```

**Terminal 2:**
```powershell
npm run dev
```

### Alternative: Use npm Scripts

```powershell
# Terminal 1: Backend
npm run backend:start

# Terminal 2: Frontend  
npm run dev
```

---

## 🐛 Troubleshooting

### Backend Issues

**Problem:** `ModuleNotFoundError` or import errors
```powershell
# Solution: Reinstall Python dependencies
pip install -r requirements.txt
```

**Problem:** Port 8000 already in use
```powershell
# Solution: Change port in .env
PORT=8001
# Or kill the process using port 8000
```

**Problem:** `GEMINI_API_KEY` not found
```powershell
# Solution: Check .env file exists and has GEMINI_API_KEY
# Make sure .env is in project root (same level as package.json)
```

### Frontend Issues

**Problem:** `npm install` fails
```powershell
# Solution: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Problem:** Port 9002 already in use
```powershell
# Solution: Change port in package.json or kill the process
# Edit package.json: "dev": "next dev --turbopack -p 9003"
```

**Problem:** Firebase connection errors
- Check `firebase/config.ts` has correct credentials
- Ensure Firestore and Authentication are enabled in Firebase Console

### AI Features Not Working

**Problem:** Quiz generation fails
- Verify `GEMINI_API_KEY` is set in `.env`
- Check backend logs for API errors
- Test API key: `curl https://generativelanguage.googleapis.com/v1/models?key=YOUR_KEY`

---

## 📁 Project Structure

```
QUIZIERRA-tejas/
├── app/                    # Python FastAPI backend
│   ├── main.py            # FastAPI app entry point
│   ├── routers/           # API routes
│   └── services/          # Business logic
├── components/            # React components
├── firebase/              # Firebase configuration
├── lib/                   # Shared utilities & types
├── public/                # Static assets
├── scripts/               # Utility scripts
├── .env                   # Environment variables (create this)
├── package.json           # Node.js dependencies
├── requirements.txt       # Python dependencies
└── README.md             # Project documentation
```

---

## 🔄 Development Workflow

1. **Make Changes:**
   - Edit code in `app/`, `components/`, etc.
   - Backend auto-reloads (--reload flag)
   - Frontend hot-reloads automatically

2. **Test Changes:**
   - Backend: Check http://127.0.0.1:8000/health
   - Frontend: Refresh browser at http://localhost:9002

3. **View Logs:**
   - Backend: Terminal 1 shows FastAPI logs
   - Frontend: Terminal 2 shows Next.js logs

---

## 🎓 First Time Setup Checklist

- [ ] Node.js installed (`node --version`)
- [ ] Python installed (`python --version`)
- [ ] Cloned repository
- [ ] Ran `npm install`
- [ ] Created Python virtual environment
- [ ] Activated virtual environment
- [ ] Ran `pip install -r requirements.txt`
- [ ] Created `.env` file
- [ ] Added `GEMINI_API_KEY` to `.env`
- [ ] Started backend (Terminal 1)
- [ ] Started frontend (Terminal 2)
- [ ] Opened http://localhost:9002
- [ ] Created test account
- [ ] Verified signup/login works

---

## 📚 Additional Resources

- **Backend API Docs:** http://127.0.0.1:8000/docs (Swagger UI)
- **Firebase Console:** https://console.firebase.google.com/
- **Gemini API Docs:** https://ai.google.dev/docs

---

## 🆘 Need Help?

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Verify all prerequisites are installed
3. Ensure `.env` file is correctly configured
4. Check backend and frontend logs for errors
5. Verify Firebase project is set up correctly

---

**Happy Coding! 🚀**

