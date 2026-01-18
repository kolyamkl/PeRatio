#!/bin/bash
# LLLM Signal Generator Service Startup
# Runs the signal generator in the background

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

LLLM_DIR="/Users/macbook/Desktop/TG_TRADE/backend/LLM_PEAR/LLM/LLLM"
LOG_FILE="/tmp/lllm_service.log"
PID_FILE="/tmp/lllm_service.pid"

cd "$LLLM_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🤖 LLLM SIGNAL SERVICE${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Service already running (PID: $OLD_PID)${NC}"
        echo -e "${YELLOW}Use './stop_lllm_service.sh' to stop it first${NC}"
        exit 1
    fi
fi

# Activate virtual environment if it exists
if [ -d "../../.venv" ]; then
    echo -e "${GREEN}📦 Activating virtual environment...${NC}"
    source ../../.venv/bin/activate
elif [ -d "/Users/macbook/Desktop/TG_TRADE/.venv" ]; then
    echo -e "${GREEN}📦 Activating virtual environment...${NC}"
    source /Users/macbook/Desktop/TG_TRADE/.venv/bin/activate
fi

# Check if running in mock or real mode
MODE="real"
INTERVAL=30

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --mock)
            MODE="mock"
            shift
            ;;
        --interval)
            INTERVAL="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--mock] [--interval MINUTES]"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}🚀 Starting LLLM Signal Service...${NC}"
echo -e "   Mode: ${MODE}"
echo -e "   Interval: ${INTERVAL} minutes"
echo -e "   Log file: ${LOG_FILE}"

# Start the service in background
if [ "$MODE" = "mock" ]; then
    nohup python3 run_signal_service.py --mock --interval "$INTERVAL" > "$LOG_FILE" 2>&1 &
else
    nohup python3 run_signal_service.py --interval "$INTERVAL" > "$LOG_FILE" 2>&1 &
fi

SERVICE_PID=$!
echo $SERVICE_PID > "$PID_FILE"

echo -e "${GREEN}✅ Service started (PID: $SERVICE_PID)${NC}"
echo -e ""
echo -e "${BLUE}Commands:${NC}"
echo -e "  View logs:  ${YELLOW}tail -f $LOG_FILE${NC}"
echo -e "  Stop:       ${YELLOW}./stop_lllm_service.sh${NC}"
echo -e "  Status:     ${YELLOW}./status_lllm_service.sh${NC}"
echo -e ""
