#!/bin/bash
# TG_TRADE Unified Startup Script
# Starts all services: Backend, Frontend, Ngrok, LocalTunnel

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="/Users/macbook/Desktop/TG_TRADE"
BACKEND_DIR="$PROJECT_DIR/backend"
LOG_DIR="/tmp/tgtrade"

# Create log directory
mkdir -p "$LOG_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 TG_TRADE STARTUP SCRIPT${NC}"
echo -e "${BLUE}========================================${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    pkill -f "uvicorn.*main:app" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "ngrok.*5173" 2>/dev/null || true
    pkill -f "lt.*8000" 2>/dev/null || true
    echo -e "${GREEN}✅ All services stopped${NC}"
}

trap cleanup EXIT

# Kill existing processes
echo -e "${YELLOW}Killing existing processes...${NC}"
pkill -f "uvicorn.*main:app" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "ngrok.*5173" 2>/dev/null || true
pkill -f "lt.*8000" 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 2

echo -e "${GREEN}✅ Old processes killed${NC}"

# Start Backend
echo -e "\n${BLUE}Starting Backend (FastAPI)...${NC}"
cd "$BACKEND_DIR"
source .venv/bin/activate
pip install -q -r requirements.txt
nohup python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
echo -e "${YELLOW}Waiting for backend...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend running on http://localhost:8000${NC}"
        break
    fi
    sleep 1
    echo -n "."
done
echo ""

# Check if backend started
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend failed to start. Check logs: $LOG_DIR/backend.log${NC}"
    tail -50 "$LOG_DIR/backend.log"
    exit 1
fi

# Start LocalTunnel for backend
echo -e "\n${BLUE}Starting LocalTunnel for Backend...${NC}"
cd "$PROJECT_DIR"
nohup lt --port 8000 --subdomain tgtrade-backend > "$LOG_DIR/localtunnel.log" 2>&1 &
LT_PID=$!
echo "LocalTunnel PID: $LT_PID"
sleep 3

# Verify LocalTunnel
if curl -s -H "bypass-tunnel-reminder: true" https://tgtrade-backend.loca.lt/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ LocalTunnel running: https://tgtrade-backend.loca.lt${NC}"
else
    echo -e "${YELLOW}⚠️ LocalTunnel might need manual password bypass${NC}"
fi

# Start Frontend
echo -e "\n${BLUE}Starting Frontend (Vite)...${NC}"
cd "$PROJECT_DIR"
nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
echo -e "${YELLOW}Waiting for frontend...${NC}"
for i in {1..20}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend running on http://localhost:5173${NC}"
        break
    fi
    sleep 1
    echo -n "."
done
echo ""

# Start Ngrok for frontend
echo -e "\n${BLUE}Starting Ngrok for Frontend...${NC}"
nohup ngrok http 5173 --url=clinton-runtier-muriel.ngrok-free.dev > "$LOG_DIR/ngrok.log" 2>&1 &
NGROK_PID=$!
echo "Ngrok PID: $NGROK_PID"
sleep 3

# Verify Ngrok
if curl -sI https://clinton-runtier-muriel.ngrok-free.dev 2>&1 | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ Ngrok running: https://clinton-runtier-muriel.ngrok-free.dev${NC}"
else
    echo -e "${YELLOW}⚠️ Ngrok connection status unclear${NC}"
fi

# Print summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 ALL SERVICES STARTED${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "📦 ${YELLOW}Backend:${NC}     http://localhost:8000"
echo -e "🌐 ${YELLOW}Backend URL:${NC} https://tgtrade-backend.loca.lt"
echo -e "💻 ${YELLOW}Frontend:${NC}    http://localhost:5173"
echo -e "🌐 ${YELLOW}Mini App:${NC}    https://clinton-runtier-muriel.ngrok-free.dev"
echo ""
echo -e "${BLUE}📋 Log Files:${NC}"
echo -e "   Backend:     $LOG_DIR/backend.log"
echo -e "   Frontend:    $LOG_DIR/frontend.log"
echo -e "   LocalTunnel: $LOG_DIR/localtunnel.log"
echo -e "   Ngrok:       $LOG_DIR/ngrok.log"
echo ""
echo -e "${BLUE}🔍 Health Check:${NC}"
curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8000/health
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo -e "${BLUE}========================================${NC}"

# Keep script running and show logs
tail -f "$LOG_DIR/backend.log"
