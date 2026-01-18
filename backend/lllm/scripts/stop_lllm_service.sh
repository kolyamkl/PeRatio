#!/bin/bash
# Stop LLLM Signal Generator Service

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PID_FILE="/tmp/lllm_service.pid"

echo -e "${YELLOW}🛑 Stopping LLLM Signal Service...${NC}"

if [ ! -f "$PID_FILE" ]; then
    echo -e "${RED}❌ Service not running (no PID file)${NC}"
    exit 1
fi

SERVICE_PID=$(cat "$PID_FILE")

if ! ps -p "$SERVICE_PID" > /dev/null 2>&1; then
    echo -e "${RED}❌ Service not running (PID $SERVICE_PID not found)${NC}"
    rm -f "$PID_FILE"
    exit 1
fi

# Send SIGTERM for graceful shutdown
kill -TERM "$SERVICE_PID" 2>/dev/null || true

# Wait up to 5 seconds for graceful shutdown
for i in {1..5}; do
    if ! ps -p "$SERVICE_PID" > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Force kill if still running
if ps -p "$SERVICE_PID" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Force killing service...${NC}"
    kill -9 "$SERVICE_PID" 2>/dev/null || true
fi

rm -f "$PID_FILE"
echo -e "${GREEN}✅ Service stopped${NC}"
