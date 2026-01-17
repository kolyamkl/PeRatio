PeRatio – Telegram Mini-App for Pair Trading
============================================

This repo contains a Telegram-ready trading mini-app with a React/Vite frontend and a FastAPI backend. The frontend provides a mobile-first trading experience with wallet integrations; the backend parses or generates trades, persists them to SQLite, and exposes simple APIs for the mini-app.

Repository Layout
-----------------
- `src/` – React + TypeScript UI (Vite, Tailwind). Key screens: `TradeConfirmPage` (order setup, wallet connect), `TradesPage` (portfolio & history), reusable cards/components, Telegram WebApp helpers, multi-wallet support (TON Connect, MetaMask, Phantom, WalletConnect, etc.).
- `backend/` – FastAPI service with SQLite storage (`trades.db` at the repo root by default). Endpoints handle generating trades, parsing Telegram-formatted signals, executing trades, and storing notification preferences.
- `public/tonconnect-manifest.json` – manifest for TON wallet connections.
- `trades.db` – local SQLite database used by the backend (checked in for convenience).

Frontend Quickstart
-------------------
Prereqs: Node 18+.

1) Install deps: `npm install`
2) Run dev server: `npm run dev`
3) Open the printed Vite URL in a browser or Telegram WebApp wrapper.

Backend Quickstart
------------------
Prereqs: Python 3.11+ (tested with 3.12).

1) Create/activate venv (recommended):
   - `python -m venv backend/.venv`
   - `source backend/.venv/bin/activate`
2) Install deps: `pip install -r backend/requirements.txt`
3) (Optional) Copy a `.env` into `backend/` to override defaults:
   - `BOT_TOKEN=` Telegram bot token for sending notifications (optional)
   - `DATABASE_URL=sqlite:///./trades.db` (default uses the repo’s `trades.db`)
   - `CORS_ORIGINS=https://your-domain.com,http://localhost:5173`
   - `MINI_APP_URL=` public URL of the mini-app for buttons in notifications
   - `PEAR_API_URL=` upstream service if needed
4) Start API: `uvicorn backend.main:app --reload --port 8000`

Core API Endpoints (backend)
----------------------------
- `POST /api/llm/generate-trade` → create a randomized pair trade for a user; persists to DB.
- `POST /api/trades/parse-message` → parse a formatted Telegram message into a stored trade.
- `GET /api/trades/{trade_id}` → fetch a stored trade.
- `POST /api/trades/{trade_id}/execute` → finalize parameters and open the trade.
- `POST /api/settings/notification` / `GET /api/settings/notification/{userId}` → store/fetch notification preferences.
- `GET /health` → health check.

Notable Frontend Features
-------------------------
- Trade confirmation flow with pair selection/swap, risk controls (SL/TP), leverage slider, and live risk/reward preview.
- Wallet UX: TON Connect plus EIP-6963 discovery for MetaMask/WalletConnect/Phantom; balance fetching for TON/ETH/SOL; haptic feedback and sticky confirm CTA.
- Trades list with search, tabbed open/closed views, summary stats, and performance chart modal.
- Telegram WebApp helpers (safe area, theme awareness, haptics) for a native-feel mini-app experience.
- Design system of cards, modals, skeletons, and animated number/performance components.

Progress & Achievements (current checkpoint)
--------------------------------------------
- Built the end-to-end mini-app shell: onboarding, trade setup, confirmation CTA, and portfolio views.
- Integrated multi-wallet support (TON Connect + browser wallets) with balance lookup and address display.
- Added rich UI polish: haptics, gradients, animations, sticky controls, market ticker, and trading signal card.
- Backend stands up with SQLite persistence, trade parsing/generation/execution endpoints, and notification preference storage.
- Default frontend backend target is currently `https://rare-pets-clean.loca.lt` (see `src/pages/TradeConfirmPage.tsx`); adjust to your tunnel or `http://localhost:8000` during local development.

Development Notes
-----------------
- Run frontend and backend separately (`npm run dev` + `uvicorn ...`); update API base URL in the frontend if your tunnel/port changes.
- SQLite file `trades.db` is tracked for convenience; replace `DATABASE_URL` to use another DB.
- No automated tests are present; validate flows manually via the UI and backend endpoints.