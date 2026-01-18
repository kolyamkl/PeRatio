# PeRatio - AI-Powered Pair Trading Bot

<p align="center">
  <img src="public/pear_bg.png" alt="PeRatio Logo" width="200"/>
</p>

<p align="center">
  <strong>Telegram Mini App for automated crypto pair trading powered by AI and Pear Protocol</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#trading-flow">Trading Flow</a>
</p>

---

## 🎯 Overview

PeRatio is a Telegram Mini App that enables users to execute **pair trades** (simultaneous long/short positions) on crypto assets using AI-generated trading signals. The app leverages:

- **GPT-4o-mini** for intelligent market analysis and signal generation
- **Pear Protocol** for on-chain pair trade execution on Hyperliquid
- **Hyperliquid** for real-time price feeds and perpetual trading
- **Telegram Bot API** for seamless mobile-first user experience

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Trading Signals** | GPT-4o-mini analyzes market momentum, volatility, and correlations |
| 📊 **Real-time Prices** | Live price feeds from Hyperliquid API |
| ⚡ **One-tap Trading** | Swipe to confirm trades with visual feedback |
| 🔐 **Wallet Integration** | Web3Modal + WalletConnect for secure signing |
| 📱 **Telegram Native** | Full Mini App integration with native UI/UX |
| 🎨 **Visual Feedback** | Confetti animations, ripple effects, glow pulses |

## 🏗️ Architecture

### System Overview

```mermaid
graph TB
    subgraph "📱 Telegram"
        TG[Telegram App]
        BOT[PeRatio Bot]
    end
    
    subgraph "🖥️ Frontend"
        MINI[Mini App<br/>React + Vite]
        WEB3[Web3Modal<br/>Wallet]
    end
    
    subgraph "⚙️ Backend"
        API[FastAPI<br/>Port 8000]
        LLM[LLLM<br/>Signal Generator]
        DB[(SQLite)]
    end
    
    subgraph "🌐 External Services"
        OPENAI[OpenAI<br/>GPT-4o-mini]
        PEAR[Pear Protocol<br/>API]
        HL[Hyperliquid<br/>DEX]
    end
    
    TG --> BOT
    BOT --> API
    TG --> MINI
    MINI --> API
    MINI --> WEB3
    WEB3 --> HL
    
    API --> DB
    API --> LLM
    LLM --> OPENAI
    API --> PEAR
    PEAR --> HL
    
    MINI -.->|Price Feed| HL
```

### Trading Signal Flow

```mermaid
sequenceDiagram
    participant U as User
    participant M as Mini App
    participant B as Backend
    participant L as LLLM Engine
    participant O as OpenAI
    participant P as Pear Protocol
    participant H as Hyperliquid
    
    U->>M: Request Trade Signal
    M->>B: POST /api/generate-trade
    B->>L: generate_signal()
    L->>O: GPT-4o-mini Analysis
    O-->>L: Trading Signal JSON
    L-->>B: Signal + Confidence
    B-->>M: Trade Recommendation
    M->>U: Display Signal Card
    
    U->>M: Confirm Trade (Swipe)
    M->>B: POST /api/execute-trade
    B->>P: Create Pair Position
    P->>H: Execute Long + Short
    H-->>P: Position Confirmed
    P-->>B: Trade Result
    B-->>M: Success + Confetti 🎉
```

### Component Architecture

```mermaid
graph LR
    subgraph "Frontend Components"
        APP[App.tsx]
        APP --> TP[TradesPage]
        APP --> TC[TradeConfirmPage]
        
        subgraph "components/layout"
            MT[MarketTicker]
            AS[AppShell]
            TB[TopBar]
        end
        
        subgraph "components/trade"
            PC[PairCard]
            TRC[TradeCard]
            SC[StickyConfirm]
            RR[RiskRewardCard]
            PM[ParamsCard]
        end
        
        subgraph "components/ui"
            CF[Confetti]
            RP[RippleButton]
            GP[GlowPulse]
        end
        
        subgraph "components/wallet"
            BC[BalanceCard]
            WM[WalletModal]
        end
        
        TP --> PC
        TP --> TRC
        TP --> MT
        
        TC --> SC
        TC --> RR
        TC --> PM
        
        SC --> CF
        TRC --> RP
        TRC --> GP
    end
    
    subgraph "lib/ Services"
        PS[priceService.ts]
        TL[telegram.ts]
        WL[wallet.tsx]
    end
    
    PC --> PS
    MT --> PS
    APP --> TL
    APP --> WL
```

## 📁 Project Structure

```
TG_TRADE/
├── 📱 Frontend (React + Vite + TypeScript)
│   ├── src/
│   │   ├── App.tsx              # Main app router
│   │   ├── main.tsx             # React entry point
│   │   │
│   │   ├── components/
│   │   │   ├── ui/              # Reusable UI primitives
│   │   │   │   ├── AnimatedNumber.tsx
│   │   │   │   ├── Confetti.tsx
│   │   │   │   ├── GlowPulse.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── RippleButton.tsx
│   │   │   │   ├── SegmentedSwitch.tsx
│   │   │   │   ├── SettingsModal.tsx
│   │   │   │   ├── Shimmer.tsx
│   │   │   │   ├── Skeleton.tsx
│   │   │   │   └── Toast.tsx
│   │   │   │
│   │   │   ├── trade/           # Trade-related components
│   │   │   │   ├── CoinSelectModal.tsx
│   │   │   │   ├── PairCard.tsx
│   │   │   │   ├── ParamsCard.tsx
│   │   │   │   ├── PerformanceChart.tsx
│   │   │   │   ├── RiskRewardCard.tsx
│   │   │   │   ├── StickyConfirm.tsx
│   │   │   │   ├── TradeCard.tsx
│   │   │   │   └── TradeSignal.tsx
│   │   │   │
│   │   │   ├── layout/          # Layout components
│   │   │   │   ├── AppShell.tsx
│   │   │   │   ├── CryptoBackground.tsx
│   │   │   │   ├── MarketTicker.tsx
│   │   │   │   ├── SplashScreen.tsx
│   │   │   │   └── TopBar.tsx
│   │   │   │
│   │   │   └── wallet/          # Wallet components
│   │   │       ├── BalanceCard.tsx
│   │   │       ├── WalletIcons.tsx
│   │   │       └── WalletModal.tsx
│   │   │
│   │   ├── pages/
│   │   │   ├── TradesPage.tsx   # Portfolio view
│   │   │   └── TradeConfirmPage.tsx
│   │   │
│   │   └── lib/                 # Utilities & services
│   │       ├── priceService.ts  # Hyperliquid price API
│   │       ├── telegram.ts      # TG WebApp helpers
│   │       ├── wallet.tsx       # Web3 wallet context
│   │       └── mockData.ts      # Mock data for development
│   │
│   ├── public/                  # Static assets
│   ├── scripts/                 # Shell scripts
│   │   └── start.sh             # Start all services
│   ├── index.html
│   └── vite.config.ts
│
├── ⚙️ Backend (FastAPI + Python)
│   ├── backend/
│   │   ├── main.py              # FastAPI app
│   │   ├── config.py            # Environment settings
│   │   ├── database.py          # SQLite + SQLModel
│   │   ├── models.py            # Trade, Position models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── pear_api.py          # Pear Protocol client
│   │   ├── requirements.txt     # Python dependencies
│   │   ├── .env                 # Backend config
│   │   │
│   │   ├── lllm/                # AI Signal Generator
│   │   │   ├── signal_generator.py  # Main signal logic
│   │   │   ├── llm_engine.py    # OpenAI integration
│   │   │   ├── basket_builder.py# Pair construction
│   │   │   ├── risk_manager.py  # Risk calculations
│   │   │   ├── pear_api_client.py
│   │   │   ├── data/            # Signal output files
│   │   │   │   └── *.json       # Generated signals
│   │   │   └── .env             # LLLM-specific config
│   │   │
│   │   └── pear-sdk/            # Pear Protocol TypeScript SDK
│   │       ├── src/
│   │       │   ├── place-order.ts
│   │       │   ├── trading-operations.ts
│   │       │   ├── config/
│   │       │   ├── examples/
│   │       │   └── utils/
│   │       └── package.json
│   │
├── 📚 Configuration
│   ├── package.json             # Frontend dependencies
│   ├── tailwind.config.js       # Tailwind CSS
│   ├── tsconfig.json            # TypeScript config
│   ├── postcss.config.js        # PostCSS config
│   └── .gitignore
│
└── 📖 Documentation
    └── README.md                # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Telegram Bot Token
- OpenAI API Key
- Pear Protocol Access Token

### 1. Clone & Install

```bash
git clone https://github.com/kolyamkl/PeRatio.git
cd TG_TRADE

# Frontend
npm install

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Backend (.env)
BOT_TOKEN=your_telegram_bot_token
BACKEND_URL=https://your-backend.loca.lt
MINI_APP_URL=https://your-frontend.ngrok-free.dev
OPENAI_API_KEY=sk-proj-...
PEAR_ACCESS_TOKEN=eyJhbGci...
PEAR_USER_WALLET=0x...
PEAR_AGENT_WALLET=0x...

# LLLM (backend/lllm/.env)
OPENAI_API_KEY=sk-proj-...
PEAR_API_URL=https://hl-v2.pearprotocol.io
PEAR_CLIENT_ID=HLHackathon9
```

### 3. Run Services

```bash
# Terminal 1: Backend
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
npm run dev

# Terminal 3: Tunnel (for Telegram)
lt --port 8000 --subdomain your-backend

# Terminal 4: Generate Signal
cd backend/lllm && python signal_generator.py --live
```

### 4. Open in Telegram

1. Message `@peratio_bot` 
2. Click "Open App" button
3. Start trading!

## 📡 API Reference

### Trading Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/generate-trade` | Generate AI trading signal |
| `POST` | `/api/execute-trade` | Execute pair trade on Pear |
| `GET` | `/api/trades` | List user's trades |
| `GET` | `/api/positions` | Get open positions |

### Generate Trade Signal

```http
POST /api/generate-trade
Content-Type: application/json

{
  "long_coin": "DOGE",
  "short_coin": "ARB",
  "bet_amount": 20,
  "leverage": 2,
  "user_id": 123456789
}
```

**Response:**
```json
{
  "signal": {
    "category": "MOMENTUM",
    "confidence": 8,
    "thesis": "DOGE shows positive momentum while ARB underperforms",
    "long": { "coin": "DOGE", "weight": 1.0 },
    "short": { "coin": "ARB", "weight": 1.0 },
    "stop_loss": 10,
    "take_profit": 20,
    "risk_reward_ratio": 2.0
  }
}
```

### Health Check

```http
GET /health

{
  "status": "ok",
  "bot_initialized": true,
  "openai_configured": true,
  "pear_configured": true
}
```

## 🔄 Trading Flow

### 1. Signal Generation

```mermaid
flowchart LR
    A[Market Data] --> B[LLLM Engine]
    B --> C{GPT-4o-mini}
    C --> D[Momentum Analysis]
    C --> E[Volatility Check]
    C --> F[Correlation Score]
    D & E & F --> G[Trading Signal]
    G --> H{Confidence ≥ 5?}
    H -->|Yes| I[✅ Approved]
    H -->|No| J[❌ Rejected]
```

### 2. Trade Execution

```mermaid
flowchart TB
    A[User Confirms] --> B[Backend receives]
    B --> C[Validate Signal]
    C --> D[Pear Protocol API]
    D --> E[Create Pair Position]
    E --> F[Long Position]
    E --> G[Short Position]
    F & G --> H[Hyperliquid DEX]
    H --> I[Positions Opened]
    I --> J[Update Database]
    J --> K[Notify User]
```

### 3. Position Monitoring

- Real-time PnL tracking via Hyperliquid WebSocket
- Stop-loss and take-profit automation
- Telegram notifications for significant events

## 🛠️ Development

### Frontend Development

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview build
```

### Backend Development

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### LLLM Signal Generator

```bash
cd backend/lllm

# Generate single signal
python signal_generator.py --live

# Run as service
./start_lllm_service.sh
```

## 🔐 Security

- Never commit `.env` files
- API keys are server-side only
- Telegram initData validation
- Wallet signing for trades
- Rate limiting on all endpoints

## 📄 License

MIT License - see LICENSE file

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

<p align="center">
  Built with ❤️ for the Hyperliquid Hackathon 2026
</p>
