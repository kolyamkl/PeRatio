#!/bin/bash
# Complete System Status Check

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}📊 TG_TRADE SYSTEM STATUS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check Frontend (port 5173)
if lsof -i:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend (Vite)${NC} - Running on port 5173"
else
    echo -e "${RED}❌ Frontend (Vite)${NC} - Not running"
fi

# Check Backend (port 8000)
if lsof -i:8000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend (FastAPI)${NC} - Running on port 8000"
else
    echo -e "${RED}❌ Backend (FastAPI)${NC} - Not running"
fi

# Check LLLM Service
if [ -f "/tmp/lllm_service.pid" ]; then
    PID=$(cat /tmp/lllm_service.pid)
    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ LLLM Signal Generator${NC} - Running (PID: $PID)"
    else
        echo -e "${RED}❌ LLLM Signal Generator${NC} - Stale PID"
    fi
else
    echo -e "${RED}❌ LLLM Signal Generator${NC} - Not running"
fi

# Check Ngrok
if pgrep -f "ngrok.*5173" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Ngrok Tunnel${NC} - Running"
else
    echo -e "${YELLOW}⚠️  Ngrok Tunnel${NC} - Not detected"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}📁 Signal Files${NC}"
echo -e "${BLUE}========================================${NC}"

SIGNAL_DIR="/Users/macbook/Desktop/TG_TRADE/backend/LLM_PEAR/LLM/LLLM"
if [ -f "$SIGNAL_DIR/latest_signal.json" ]; then
    SIZE=$(ls -lh "$SIGNAL_DIR/latest_signal.json" | awk '{print $5}')
    TIMESTAMP=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$SIGNAL_DIR/latest_signal.json" 2>/dev/null || stat -c "%y" "$SIGNAL_DIR/latest_signal.json" 2>/dev/null | cut -d'.' -f1)
    echo -e "${GREEN}✅ Latest Signal${NC}"
    echo -e "   File: latest_signal.json"
    echo -e "   Size: $SIZE"
    echo -e "   Modified: $TIMESTAMP"
else
    echo -e "${RED}❌ No signal file found${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔗 Quick Commands${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Frontend:    ${YELLOW}http://localhost:5173${NC}"
echo -e "Backend API: ${YELLOW}http://localhost:8000${NC}"
echo -e "API Docs:    ${YELLOW}http://localhost:8000/docs${NC}"
echo ""
echo -e "LLLM Status: ${YELLOW}cd $SIGNAL_DIR && ./status_lllm_service.sh${NC}"
echo -e "LLLM Logs:   ${YELLOW}tail -f /tmp/lllm_service.log${NC}"
echo -e "View Signal: ${YELLOW}cat $SIGNAL_DIR/latest_signal.json${NC}"
echo ""
