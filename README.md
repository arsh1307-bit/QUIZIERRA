Development notes — start backend and frontend

1) Install Python requirements (create and activate virtualenv recommended):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2) Start the Python backend (FastAPI / Uvicorn):

```powershell
# from repo root
npm run backend:start
# or
.\scripts\start-backend.ps1
```

3) In a second terminal, install node deps and start Next dev:

```powershell
npm install
npm run dev
```

Notes:
- The Next.js API route `/api/generate-quiz` proxies to the Python endpoint at `http://127.0.0.1:8000/ai/from_text` by default. You can change the base URL by setting `PYTHON_AI_BASE` in your environment.
- Ensure `GEMINI_API_KEY` and optionally `GEMINI_MODEL` are set in your `.env` file (project root) for the Python code to call Gemini.
- If the Python service is unreachable, the API will return deterministic fallback quiz items so the UI remains usable.
