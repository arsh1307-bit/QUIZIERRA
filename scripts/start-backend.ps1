# Start the Python FastAPI backend (Uvicorn)
# Usage: .\scripts\start-backend.ps1
param()

Write-Host "Starting Python backend (uvicorn app.main:app) on port 8000..."
python -m uvicorn app.main:app --reload --port 8000
