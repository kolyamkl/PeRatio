# 🚀 LLLM Quick Start

## Start/Stop/Status

```bash
cd /Users/macbook/Desktop/TG_TRADE/backend/LLM_PEAR/LLM/LLLM

# Start service
./start_lllm_service.sh

# Check status
./status_lllm_service.sh

# Stop service
./stop_lllm_service.sh

# View live logs
tail -f /tmp/lllm_service.log
```

## Service is Running ✅

Your LLLM signal generator is now running as a background service:
- Generates signals every **30 minutes**
- Uses **real OpenAI GPT-4o-mini** 
- Saves to `latest_signal.json`
- Backend reads signals automatically

## What's Deployed?

```
┌─────────────────────────────────────────────┐
│  Frontend (Vite + React)          ✅ Running│
│  Backend (FastAPI)                ✅ Running│
│  LLLM Signal Generator            ✅ Running│ ← NEW!
│  Ngrok                            ✅ Running│
└─────────────────────────────────────────────┘
```

## How It Works

1. **LLLM Service** (background) → Generates signals every 30 min
2. **Signal Files** (JSON) → Saved to disk
3. **Backend API** → Reads signals when users request
4. **Mini App** → Users see and execute trades

## All Your Running Services

| Service | Status | Port | Command |
|---------|--------|------|---------|
| Frontend | ✅ Running | 5173 | `npm run dev` |
| Backend API | ✅ Running | 8000 | `uvicorn main:app` |
| LLLM Signal | ✅ Running | - | `run_signal_service.py` |
| Ngrok | ✅ Running | - | `ngrok http 5173` |

## Test It

1. Open your mini app
2. Click "Generate Trade" 
3. You should see a fresh signal from LLLM!

## Monitor Logs

```bash
# LLLM logs
tail -f /tmp/lllm_service.log

# Backend logs
# (check your backend terminal)

# View latest signal
cat /Users/macbook/Desktop/TG_TRADE/backend/LLM_PEAR/LLM/LLLM/latest_signal.json
```

## Troubleshooting

**If LLLM stops working:**
```bash
./stop_lllm_service.sh
./start_lllm_service.sh --mock  # Use mock mode to test
```

**If OpenAI rate limit hit:**
```bash
./stop_lllm_service.sh
./start_lllm_service.sh --interval 60  # Generate every hour instead
```

## Your Complete System

Everything is now deployed:
- ✅ React frontend with wallet integration
- ✅ FastAPI backend with Telegram bot
- ✅ LLLM signal generator (continuous)
- ✅ Ngrok tunnel for external access
- ✅ All connected and working!

🎉 **You're fully deployed!**
