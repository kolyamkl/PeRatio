@echo off
REM Local Development Startup Script for PeRatio with Basket Trading (Windows)

echo.
echo 🍐 PeRatio - Starting Local Development Environment
echo ==================================================
echo.

REM Check if .env exists
if not exist .env (
    echo ❌ .env file not found!
    echo Creating from env.example...
    copy env.example .env
    echo ⚠️  Please update .env with your actual values
    exit /b 1
)

REM Check if backend/.env exists
if not exist backend\.env (
    echo ⚠️  backend/.env not found, creating...
    (
        echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tg_trade
        echo TELEGRAM_BOT_TOKEN=%TELEGRAM_BOT_TOKEN%
        echo BACKEND_URL=http://localhost:8000
        echo LOG_DIR=./logs
        echo API_URL=https://hl-v2.pearprotocol.io
        echo CLIENT_ID=APITRADER
    ) > backend\.env
)

REM Install SDK dependencies
echo.
echo 📦 Installing Pear SDK dependencies...
cd backend\pear-sdk
if not exist node_modules (
    call npm install
    echo ✅ SDK dependencies installed
) else (
    echo ✅ SDK dependencies already installed
)
cd ..\..

REM Check if Python venv exists
if not exist .venv (
    echo.
    echo 🐍 Creating Python virtual environment...
    python -m venv .venv
)

REM Activate venv and install backend dependencies
echo.
echo 📦 Installing backend dependencies...
call .venv\Scripts\activate
cd backend
pip install -r requirements.txt >nul 2>&1
echo ✅ Backend dependencies installed
cd ..

REM Install frontend dependencies
echo.
echo 📦 Installing frontend dependencies...
if not exist node_modules (
    call npm install
    echo ✅ Frontend dependencies installed
) else (
    echo ✅ Frontend dependencies already installed
)

echo.
echo ==================================================
echo ✅ Setup complete!
echo.
echo To start the application:
echo.
echo   Terminal 1 (Backend):
echo     cd backend
echo     ..\\.venv\Scripts\activate
echo     uvicorn main:app --reload --host 0.0.0.0 --port 8000
echo.
echo   Terminal 2 (Frontend):
echo     npm run dev
echo.
echo Access:
echo   - Frontend: http://localhost:5173
echo   - Backend: http://localhost:8000
echo   - API Docs: http://localhost:8000/docs
echo.
echo 📚 See BASKET_TRADING_GUIDE.md for testing instructions
echo ==================================================
echo.
pause
