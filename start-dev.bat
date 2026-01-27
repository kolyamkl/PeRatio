@echo off
echo.
echo ========================================
echo 🍐 PeRatio - Starting Development Servers
echo ========================================
echo.

REM Check if backend dependencies are installed
cd backend
python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo Installing backend dependencies...
    pip install fastapi uvicorn sqlmodel psycopg2-binary python-telegram-bot httpx python-dotenv pydantic-settings requests slowapi python-multipart
)

echo.
echo Starting Backend Server on http://localhost:8000
echo.
start "Backend Server" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

cd ..
echo.
echo Starting Frontend Server on http://localhost:5173
echo.
start "Frontend Server" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ========================================
echo ✅ Servers Starting!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo.
echo Basket Trading: http://localhost:5173/basket
echo.
echo Press any key to open browser...
pause >nul

start http://localhost:5173/basket

echo.
echo Servers are running in separate windows.
echo Close those windows to stop the servers.
echo.
