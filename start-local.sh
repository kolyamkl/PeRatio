#!/bin/bash

# Local Development Startup Script for PeRatio with Basket Trading

echo "🍐 PeRatio - Starting Local Development Environment"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Creating from env.example..."
    cp env.example .env
    echo -e "${YELLOW}⚠️  Please update .env with your actual values${NC}"
    exit 1
fi

# Check if backend/.env exists
if [ ! -f backend/.env ]; then
    echo -e "${YELLOW}⚠️  backend/.env not found, creating...${NC}"
    cat > backend/.env << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tg_trade
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
BACKEND_URL=http://localhost:8000
LOG_DIR=./logs
API_URL=https://hl-v2.pearprotocol.io
CLIENT_ID=APITRADER
EOF
fi

# Install SDK dependencies
echo ""
echo "📦 Installing Pear SDK dependencies..."
cd backend/pear-sdk
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✅ SDK dependencies installed${NC}"
else
    echo -e "${GREEN}✅ SDK dependencies already installed${NC}"
fi
cd ../..

# Check if Python venv exists
if [ ! -d ".venv" ]; then
    echo ""
    echo "🐍 Creating Python virtual environment..."
    python -m venv .venv
fi

# Activate venv and install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
source .venv/bin/activate 2>/dev/null || . .venv/Scripts/activate 2>/dev/null
cd backend
pip install -r requirements.txt > /dev/null 2>&1
echo -e "${GREEN}✅ Backend dependencies installed${NC}"
cd ..

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Frontend dependencies already installed${NC}"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "To start the application:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend"
echo "    source ../.venv/bin/activate  # or .venv/Scripts/activate on Windows"
echo "    uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    npm run dev"
echo ""
echo "Access:"
echo "  - Frontend: http://localhost:5173"
echo "  - Backend: http://localhost:8000"
echo "  - API Docs: http://localhost:8000/docs"
echo ""
echo "📚 See BASKET_TRADING_GUIDE.md for testing instructions"
echo "=================================================="
