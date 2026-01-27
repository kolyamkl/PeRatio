# 🚀 Quick Start Guide - Local Development

## Prerequisites

- Node.js 18+ installed
- Python 3.11+ installed
- PostgreSQL running (or use Docker for just the database)

## Step 1: Install Dependencies

### Backend SDK
```bash
cd backend/pear-sdk
npm install
cd ../..
```

### Backend Python
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cd ..
```

### Frontend
```bash
npm install
```

## Step 2: Configure Environment

### Backend `.env` file
Create `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tg_trade
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
BACKEND_URL=http://localhost:8000
LOG_DIR=./logs

# Pear Protocol SDK
API_URL=https://hl-v2.pearprotocol.io
CLIENT_ID=APITRADER
```

### Root `.env` file
Create `.env` in root:
```env
POSTGRES_PASSWORD=postgres
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
BACKEND_URL=http://localhost:8000
VITE_BACKEND_URL=http://localhost:8000
```

## Step 3: Start PostgreSQL

### Option A: Docker (Recommended)
```bash
docker run --name tg_trade_postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=tg_trade -p 5432:5432 -d postgres:15-alpine
```

### Option B: Local PostgreSQL
Make sure PostgreSQL is running and create database:
```sql
CREATE DATABASE tg_trade;
```

## Step 4: Start Backend

Open a new terminal:
```bash
cd backend
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Mac/Linux

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Backend will be available at:** http://localhost:8000
**API Docs:** http://localhost:8000/docs

## Step 5: Start Frontend

Open another terminal:
```bash
npm run dev
```

**Frontend will be available at:** http://localhost:5173

## 🎯 Test the Integration

### 1. Open Frontend
Navigate to: http://localhost:5173/basket

### 2. Connect Wallet
- Click "Connect Wallet"
- Choose MetaMask (or your preferred wallet)
- Approve connection

### 3. Authenticate with Pear
- Click "Authenticate" button
- Sign the EIP-712 message in your wallet
- Wait for authentication to complete

### 4. Build a Basket Trade
- Add long assets (e.g., BTC, ETH)
- Add short assets (optional, e.g., DOGE)
- Set USD value (minimum $10)
- Adjust leverage (1-100x)
- Click "Execute Basket Trade"

### 5. View Positions
Navigate to: http://localhost:5173/trades

## 🧪 Test Backend API Directly

### Test Authentication
```bash
curl -X POST http://localhost:8000/api/basket/authenticate \
  -H "Content-Type: application/json" \
  -d '{"privateKey": "0x..."}'
```

Save the `accessToken` from response.

### Test Basket Trade
```bash
curl -X POST http://localhost:8000/api/basket/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "longAssets": [{"asset": "BTC", "weight": 1.0}],
    "shortAssets": [],
    "usdValue": 10,
    "leverage": 1,
    "slippage": 0.08
  }'
```

## 📱 Available Routes

| Route | Description |
|-------|-------------|
| `/` | Trade confirmation page |
| `/trades` | View all trades and positions |
| `/basket` | **NEW** Basket trade builder |

## 🔧 Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `psql -U postgres -c "SELECT 1"`
- Check .env file exists in `backend/` directory
- Check Python dependencies: `pip list`

### Frontend won't connect to backend
- Verify backend is running on port 8000
- Check `VITE_BACKEND_URL` in root `.env`
- Check browser console for CORS errors

### SDK errors
- Run `npm install` in `backend/pear-sdk`
- Check `tsx` is available: `npx tsx --version`
- Check Node.js version: `node --version` (should be 18+)

### Authentication fails
- Check private key format (must start with 0x)
- Verify Pear Protocol API is accessible
- Check backend logs for detailed errors

## 🎨 Development Tips

### Hot Reload
Both frontend and backend support hot reload:
- Frontend: Changes auto-refresh
- Backend: Changes auto-restart (with `--reload`)

### View Logs
- Backend: Check terminal output or `backend/logs/backend.log`
- Frontend: Check browser console (F12)

### Database
View database:
```bash
psql -U postgres -d tg_trade
\dt  # List tables
SELECT * FROM trades;
```

## 🚀 Next Steps

1. **Test basket trading** - Create different basket configurations
2. **Add more assets** - Try multi-asset baskets
3. **Test Agent signals** - Execute signals from Agent Pear
4. **Monitor positions** - View open positions and PnL
5. **Close positions** - Test position management

## 📚 Documentation

- **Backend API:** http://localhost:8000/docs
- **Basket Trading Guide:** `BASKET_TRADING_GUIDE.md`
- **Implementation Summary:** `IMPLEMENTATION_SUMMARY.md`
- **SDK Comparison:** `backend/pear-sdk/SDK_COMPARISON.md`

## 🎯 Quick Commands Reference

```bash
# Backend
cd backend && uvicorn main:app --reload

# Frontend
npm run dev

# SDK Demo
cd backend/pear-sdk && npm run sdk:demo

# Test SDK
cd backend/pear-sdk && npm run test:quick

# Check agent status
cd backend/pear-sdk && npm run status
```

---

**Happy Trading! 🍐**
