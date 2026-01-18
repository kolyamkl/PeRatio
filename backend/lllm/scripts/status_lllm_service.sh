#!/bin/bash
# Check LLLM Signal Generator Service Status

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PID_FILE="/tmp/lllm_service.pid"
LOG_FILE="/tmp/lllm_service.log"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}📊 LLLM SERVICE STATUS${NC}"
echo -e "${BLUE}========================================${NC}"

if [ ! -f "$PID_FILE" ]; then
    echo -e "${RED}❌ Service not running${NC}"
    echo -e ""
    echo -e "${YELLOW}Start with: ./start_lllm_service.sh${NC}"
    exit 1
fi

SERVICE_PID=$(cat "$PID_FILE")

if ! ps -p "$SERVICE_PID" > /dev/null 2>&1; then
    echo -e "${RED}❌ Service not running (stale PID: $SERVICE_PID)${NC}"
    rm -f "$PID_FILE"
    exit 1
fi

echo -e "${GREEN}✅ Service running${NC}"
echo -e "   PID: ${SERVICE_PID}"

# Get process info
if command -v ps &> /dev/null; then
    PROCESS_INFO=$(ps -p "$SERVICE_PID" -o etime= 2>/dev/null | xargs)
    if [ -n "$PROCESS_INFO" ]; then
        echo -e "   Uptime: ${PROCESS_INFO}"
    fi
fi

# Show latest log entries
if [ -f "$LOG_FILE" ]; then
    echo -e ""
    echo -e "${BLUE}Recent logs (last 10 lines):${NC}"
    echo -e "${BLUE}----------------------------------------${NC}"
    tail -n 10 "$LOG_FILE"
    echo -e "${BLUE}----------------------------------------${NC}"
    echo -e ""
    echo -e "${YELLOW}Full logs: tail -f $LOG_FILE${NC}"
fi

echo -e ""
