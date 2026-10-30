@echo off
echo ======================================================================
echo   CIVICAGENT: Autonomous Bureaucracy Execution Agent
echo ======================================================================
echo Starting FastAPI Gateway on http://localhost:8000...
echo Interactive API docs at: http://localhost:8000/docs
echo.

set PYTHONPATH=.;.venv\Lib\site-packages
py -3.13 -m uvicorn app.api.main:app --host 0.0.0.0 --port 8000 --reload
