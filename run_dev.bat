@echo off
echo ======================================================================
echo   CIVICAGENT: Autonomous Scholarship & Bureaucracy Execution Platform
echo ======================================================================
echo [1/2] Starting Frontend Web Cockpit at http://localhost:5173 ...
start "CivicAgent Cockpit (Frontend)" cmd /c "cd /d %~dp0frontend && npm run dev"

echo [2/2] Starting Backend API Gateway at http://localhost:8000 ...
start "CivicAgent API Gateway (Backend)" cmd /c "cd /d %~dp0 && set PYTHONPATH=.;.venv\Lib\site-packages && .venv\Scripts\python.exe -m uvicorn app.api.main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo Both services launched in separate windows!
echo - Split-Screen Web Cockpit: http://localhost:5173
echo - FastAPI Interactive Docs: http://localhost:8000/docs
echo.
