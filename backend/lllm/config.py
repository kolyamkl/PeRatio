"""
RATIO Bot Configuration
=======================
Centralized configuration for the multi-asset basket trading system.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from LLLM directory's .env file
_config_dir = Path(__file__).parent
_env_path = _config_dir / ".env"
load_dotenv(dotenv_path=_env_path)

# =============================================================================
# API KEYS (from .env file)
# =============================================================================
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
EODHD_API_KEY = os.getenv("EODHD_API_KEY", "")

# =============================================================================
# PEAR PROTOCOL CONFIGURATION (from .env or Api configs/EXPORT_DATA.json)
# =============================================================================
PEAR_API_URL = os.getenv("PEAR_API_URL", "https://hl-v2.pearprotocol.io")
PEAR_CLIENT_ID = os.getenv("PEAR_CLIENT_ID", "HLHackathon9")
PEAR_PRIVATE_KEY = os.getenv("PEAR_PRIVATE_KEY", "")
PEAR_USER_WALLET = os.getenv("PEAR_USER_WALLET", "")
PEAR_AGENT_WALLET = os.getenv("PEAR_AGENT_WALLET", "")
PEAR_BUILDER_ADDRESS = os.getenv("PEAR_BUILDER_ADDRESS", "")
PEAR_ACCESS_TOKEN = os.getenv("PEAR_ACCESS_TOKEN", "")

# Legacy compatibility
PEAR_API_KEY = PEAR_ACCESS_TOKEN or os.getenv("PEAR_API_KEY", "")

# =============================================================================
# ASSET UNIVERSE (23 Total Assets)
# =============================================================================

# Crypto Assets - CONFIRMED WORKING on Hyperliquid/Pear Protocol
# These have been tested and execute successfully
CRYPTO_ASSETS = [
    "BTC",    # Bitcoin - Store of Value ✅
    "ETH",    # Ethereum - Smart Contract L1 ✅
    "SOL",    # Solana - Alt L1 ✅
    "ARB",    # Arbitrum - L2 ✅
    "OP",     # Optimism - L2 ✅
    "DOGE",   # Dogecoin - Meme ✅
    "MATIC",  # Polygon - L2 ✅
]

# Note: The following FAIL with 500 errors - NOT supported:
# - LINK (Chainlink) - returns 500 error
# - XRP (Ripple) - returns 500 error  
# - AVAX (Avalanche) - returns 500 error
# - PAXG (PAX Gold) - returns 500 error
# - Traditional metals (XAU, XAG) - not tokenized on HL

# Metal/Commodity Assets (5)
METAL_ASSETS = [
    "XAU",    # Gold - Precious Metal (safe haven)
    "XAG",    # Silver - Precious Metal
    "XPT",    # Platinum - Precious Metal
    "XPD",    # Palladium - Industrial Metal
    "HG",     # Copper - Industrial Metal
]

# Tech Stock Assets (8)
STOCK_ASSETS = [
    "AAPL",   # Apple
    "NVDA",   # NVIDIA
    "TSLA",   # Tesla
    "MSFT",   # Microsoft
    "GOOGL",  # Alphabet
    "AMZN",   # Amazon
    "META",   # Meta
    "AMD",    # AMD
]

# Combined asset list - CRYPTO ONLY for Hyperliquid/Pear Protocol
# (Metals and stocks not supported on Hyperliquid DEX)
ALL_ASSETS = CRYPTO_ASSETS

# Asset class mapping
ASSET_CLASSES = {
    "CRYPTO": CRYPTO_ASSETS,
    "METALS": METAL_ASSETS,  # Not tradeable on Hyperliquid
    "STOCKS": STOCK_ASSETS,  # Not tradeable on Hyperliquid
}

# Tradeable assets on Pear Protocol (Hyperliquid)
TRADEABLE_ASSETS = CRYPTO_ASSETS

# =============================================================================
# BASKET TRADING CONFIGURATION
# =============================================================================

# Maximum assets per side of the trade
MAX_ASSETS_PER_SIDE = 5

# Minimum weight per asset (10%)
MIN_WEIGHT_PER_ASSET = 0.10

# Weighting methods available
WEIGHTING_METHODS = ["equal", "volatility", "conviction", "market_cap"]

# =============================================================================
# TRADING PARAMETERS
# =============================================================================

# Confidence threshold (0-10 scale, only trade if >= this)
CONFIDENCE_THRESHOLD = 5.0

# Maximum concurrent open positions
MAX_POSITIONS = 3

# Maximum leverage allowed
MAX_LEVERAGE = 4.0

# Risk per trade (1% of account)
RISK_PER_TRADE = 0.01

# Account balance (from env or default)
ACCOUNT_BALANCE = float(os.getenv("ACCOUNT_BALANCE", "20000"))

# =============================================================================
# SCHEDULE CONFIGURATION
# =============================================================================

# Trading cycle hours (UTC)
CYCLE_HOURS = [0, 4, 8, 12, 16, 20]  # Every 4 hours

# Timezone
TIMEZONE = "UTC"

# =============================================================================
# LLM CONFIGURATION
# =============================================================================

# OpenAI model
LLM_MODEL = "gpt-4o-mini"

# Temperature (higher = more creative/varied responses)
LLM_TEMPERATURE = 0.8

# Max tokens for response
LLM_MAX_TOKENS = 2000

# Retry settings
LLM_MAX_RETRIES = 5
LLM_RETRY_DELAY = 1  # seconds

# =============================================================================
# PEAR PROTOCOL CONFIGURATION
# =============================================================================

# Pear Protocol API base URL (uses the configured URL from env)
PEAR_API_BASE_URL = PEAR_API_URL

# Default slippage settings
DEFAULT_SLIPPAGE_CRYPTO = 0.01      # 1% for crypto
DEFAULT_SLIPPAGE_METALS = 0.02      # 2% for metals
DEFAULT_SLIPPAGE_STOCKS = 0.02      # 2% for stocks
DEFAULT_SLIPPAGE_MIXED = 0.015      # 1.5% for mixed baskets

# Execution types
EXECUTION_TYPES = ["MARKET", "TWAP", "TRIGGER", "LADDER"]

# Default TWAP settings
DEFAULT_TWAP_DURATION = 60          # minutes
DEFAULT_TWAP_INTERVAL = 30          # seconds

# =============================================================================
# RISK MANAGEMENT
# =============================================================================

# Stop-loss and take-profit limits (STRICT)
MIN_SL_PERCENT = 3       # Minimum stop loss 3%
MAX_SL_PERCENT = 10      # Maximum stop loss 10%
MIN_TP_PERCENT = 10      # Minimum take profit 10%
MAX_TP_PERCENT = 50      # Maximum take profit 50%

# Trade Size Limits
MIN_TRADE_USD = 20       # Minimum trade size in USD
MAX_TRADE_USD = 30       # Maximum trade size in USD

# Volatility baselines by asset class (7-day average)
VOLATILITY_BASELINES = {
    "CRYPTO": 5.0,      # Crypto baseline volatility
    "METALS": 1.5,      # Metals baseline volatility (much lower)
    "STOCKS": 2.5,      # Stocks baseline volatility
}

# =============================================================================
# DATA COLLECTION
# =============================================================================

# Hyperliquid API (public, no auth needed)
HYPERLIQUID_API_URL = "https://api.hyperliquid.xyz/info"

# EODHD API
EODHD_API_URL = "https://eodhd.com/api"

# Data refresh interval (seconds)
DATA_REFRESH_INTERVAL = 60

# Historical data lookback (days)
HISTORICAL_LOOKBACK_DAYS = 7

# =============================================================================
# LOGGING & MONITORING
# =============================================================================

# Log level
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Trade log file
TRADES_CSV_FILE = "trades.csv"

# Performance log file
PERFORMANCE_CSV_FILE = "performance.csv"

# Signal log file
SIGNALS_LOG_FILE = "logs/signals.log"

# =============================================================================
# VALIDATION
# =============================================================================

def validate_config():
    """Validate critical configuration settings"""
    errors = []
    
    if not OPENAI_API_KEY:
        errors.append("OPENAI_API_KEY is not set")
    
    if CONFIDENCE_THRESHOLD < 0 or CONFIDENCE_THRESHOLD > 10:
        errors.append("CONFIDENCE_THRESHOLD must be between 0 and 10")
    
    if MAX_ASSETS_PER_SIDE < 1 or MAX_ASSETS_PER_SIDE > 10:
        errors.append("MAX_ASSETS_PER_SIDE must be between 1 and 10")
    
    if RISK_PER_TRADE <= 0 or RISK_PER_TRADE > 0.1:
        errors.append("RISK_PER_TRADE must be between 0 and 0.1 (10%)")
    
    return len(errors) == 0, errors


if __name__ == "__main__":
    # Test configuration
    is_valid, errors = validate_config()
    if is_valid:
        print("✓ Configuration is valid")
        print(f"  Total assets: {len(ALL_ASSETS)}")
        print(f"  Crypto: {len(CRYPTO_ASSETS)}")
        print(f"  Metals: {len(METAL_ASSETS)}")
        print(f"  Stocks: {len(STOCK_ASSETS)}")
    else:
        print("✗ Configuration errors:")
        for error in errors:
            print(f"  - {error}")

