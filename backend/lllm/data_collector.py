"""
RATIO Bot Data Collector
========================
Fetches real-time market data from multiple sources:
- Hyperliquid API: Crypto prices, funding rates, momentum
- EODHD API: Stocks, metals, sentiment, macro data
"""

import logging
import time
from datetime import datetime, timedelta
from typing import Optional
import requests
import numpy as np

from lllm_config import (
    HYPERLIQUID_API_URL,
    EODHD_API_URL,
    EODHD_API_KEY,
    CRYPTO_ASSETS,
    METAL_ASSETS,
    STOCK_ASSETS,
    ALL_ASSETS,
    HISTORICAL_LOOKBACK_DAYS,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HyperliquidAPI:
    """
    Client for Hyperliquid public API.
    No authentication required.
    """
    
    BASE_URL = HYPERLIQUID_API_URL
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json"
        })
        logger.info("Hyperliquid API client initialized")
    
    def _post(self, payload: dict) -> dict:
        """Make a POST request to Hyperliquid API."""
        try:
            response = self.session.post(self.BASE_URL, json=payload, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Hyperliquid API error: {e}")
            return {}
    
    def get_all_mids(self) -> dict:
        """
        Get all mid prices from Hyperliquid.
        
        Returns:
            Dict mapping symbol to mid price
        """
        payload = {"type": "allMids"}
        data = self._post(payload)
        
        # Convert to simple dict
        prices = {}
        if isinstance(data, dict):
            for symbol, price in data.items():
                try:
                    prices[symbol] = float(price)
                except (ValueError, TypeError):
                    continue
        
        return prices
    
    def get_meta_and_asset_ctxs(self) -> tuple[dict, list]:
        """
        Get metadata and asset contexts (includes funding rates).
        
        Returns:
            Tuple of (meta_dict, asset_contexts_list)
        """
        payload = {"type": "metaAndAssetCtxs"}
        data = self._post(payload)
        
        if isinstance(data, list) and len(data) >= 2:
            return data[0], data[1]
        return {}, []
    
    def get_funding_rates(self) -> dict:
        """
        Get current funding rates for all perpetuals.
        
        Returns:
            Dict mapping symbol to funding rate
        """
        meta, contexts = self.get_meta_and_asset_ctxs()
        
        funding_rates = {}
        if meta and "universe" in meta:
            for i, asset_info in enumerate(meta["universe"]):
                symbol = asset_info.get("name", "")
                if i < len(contexts):
                    ctx = contexts[i]
                    funding = ctx.get("funding", "0")
                    try:
                        funding_rates[symbol] = float(funding) * 100  # Convert to percentage
                    except (ValueError, TypeError):
                        funding_rates[symbol] = 0.0
        
        return funding_rates
    
    def get_candles(self, symbol: str, interval: str = "4h", limit: int = 50) -> list:
        """
        Get historical candle data.
        
        Args:
            symbol: Trading pair symbol
            interval: Candle interval (1m, 5m, 15m, 1h, 4h, 1d)
            limit: Number of candles
            
        Returns:
            List of candle dicts with open, high, low, close, volume
        """
        # Interval mapping
        interval_ms = {
            "1m": 60000,
            "5m": 300000,
            "15m": 900000,
            "1h": 3600000,
            "4h": 14400000,
            "1d": 86400000,
        }
        
        interval_val = interval_ms.get(interval, 14400000)
        
        payload = {
            "type": "candleSnapshot",
            "req": {
                "coin": symbol,
                "interval": interval,
                "startTime": int((time.time() - limit * interval_val / 1000) * 1000),
                "endTime": int(time.time() * 1000)
            }
        }
        
        data = self._post(payload)
        
        candles = []
        if isinstance(data, list):
            for candle in data:
                candles.append({
                    "timestamp": candle.get("t", 0),
                    "open": float(candle.get("o", 0)),
                    "high": float(candle.get("h", 0)),
                    "low": float(candle.get("l", 0)),
                    "close": float(candle.get("c", 0)),
                    "volume": float(candle.get("v", 0)),
                })
        
        return candles
    
    def calculate_momentum(self, symbol: str, hours: int = 4) -> float:
        """
        Calculate momentum (% change) over specified hours.
        
        Args:
            symbol: Trading symbol
            hours: Lookback hours
            
        Returns:
            Percentage change
        """
        interval = "1h" if hours <= 4 else "4h"
        limit = max(hours, 10)
        
        candles = self.get_candles(symbol, interval, limit)
        
        if len(candles) >= 2:
            # Get price from hours ago vs now
            lookback_idx = min(hours, len(candles) - 1)
            old_price = candles[-lookback_idx - 1]["close"]
            new_price = candles[-1]["close"]
            
            if old_price > 0:
                return ((new_price - old_price) / old_price) * 100
        
        return 0.0
    
    def calculate_volatility(self, symbol: str, days: int = 7) -> float:
        """
        Calculate volatility (std dev of daily returns) over specified days.
        
        Args:
            symbol: Trading symbol
            days: Lookback days
            
        Returns:
            Annualized volatility percentage
        """
        candles = self.get_candles(symbol, "1d", days + 1)
        
        if len(candles) >= 2:
            closes = [c["close"] for c in candles]
            returns = []
            
            for i in range(1, len(closes)):
                if closes[i - 1] > 0:
                    ret = (closes[i] - closes[i - 1]) / closes[i - 1]
                    returns.append(ret)
            
            if returns:
                # Daily volatility as percentage
                return np.std(returns) * 100
        
        return 0.0


class EODHD_API:
    """
    Client for EODHD API.
    Provides stock prices, metal prices, sentiment, and macro data.
    """
    
    BASE_URL = EODHD_API_URL
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or EODHD_API_KEY
        self.session = requests.Session()
        
        if not self.api_key:
            logger.warning("EODHD API key not set - some features will be limited")
        else:
            logger.info("EODHD API client initialized")
    
    def _get(self, endpoint: str, params: dict = None) -> dict:
        """Make a GET request to EODHD API."""
        params = params or {}
        params["api_token"] = self.api_key
        params["fmt"] = "json"
        
        url = f"{self.BASE_URL}/{endpoint}"
        
        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"EODHD API error: {e}")
            return {}
    
    def get_stock_price(self, symbol: str) -> dict:
        """
        Get real-time stock price.
        
        Args:
            symbol: Stock symbol (e.g., "AAPL")
            
        Returns:
            Dict with price data
        """
        data = self._get(f"real-time/{symbol}.US")
        
        if data and "close" in data:
            return {
                "price": float(data.get("close", 0)),
                "change": float(data.get("change", 0)),
                "change_percent": float(data.get("change_p", 0)),
                "volume": float(data.get("volume", 0)),
            }
        
        return {"price": 0, "change": 0, "change_percent": 0, "volume": 0}
    
    def get_commodity_price(self, symbol: str) -> dict:
        """
        Get commodity/metal price.
        
        Args:
            symbol: Commodity symbol (e.g., "GC" for gold)
            
        Returns:
            Dict with price data
        """
        # Commodity symbol mapping
        commodity_symbols = {
            "XAU": "GC.COMEX",    # Gold
            "XAG": "SI.COMEX",    # Silver
            "XPT": "PL.COMEX",    # Platinum
            "XPD": "PA.COMEX",    # Palladium
            "HG": "HG.COMEX",     # Copper
        }
        
        eodhd_symbol = commodity_symbols.get(symbol, symbol)
        data = self._get(f"real-time/{eodhd_symbol}")
        
        if data and "close" in data:
            return {
                "price": float(data.get("close", 0)),
                "change": float(data.get("change", 0)),
                "change_percent": float(data.get("change_p", 0)),
            }
        
        return {"price": 0, "change": 0, "change_percent": 0}
    
    def get_sentiment(self, symbol: str) -> float:
        """
        Get sentiment score for a symbol.
        
        Args:
            symbol: Stock/crypto symbol
            
        Returns:
            Sentiment score (-1 to +1)
        """
        # Use news sentiment endpoint
        data = self._get("sentiments", params={"s": symbol})
        
        if isinstance(data, dict) and "sentiment" in data:
            return float(data.get("sentiment", 0))
        
        # Default neutral sentiment
        return 0.0
    
    def get_fear_greed_index(self) -> float:
        """
        Get crypto fear/greed index (alternative data source).
        
        Returns:
            Fear/greed score (0-100, normalized to -1 to +1)
        """
        # Note: EODHD might not have this - use alternative.me API as fallback
        try:
            response = requests.get(
                "https://api.alternative.me/fng/",
                timeout=10
            )
            if response.ok:
                data = response.json()
                if "data" in data and len(data["data"]) > 0:
                    value = int(data["data"][0]["value"])
                    # Normalize 0-100 to -1 to +1
                    return (value - 50) / 50
        except Exception as e:
            logger.warning(f"Failed to get fear/greed index: {e}")
        
        return 0.0
    
    def get_macro_indicators(self) -> dict:
        """
        Get macro economic indicators.
        
        Returns:
            Dict with DXY, yields, VIX, etc.
        """
        indicators = {}
        
        # DXY (Dollar Index)
        dxy_data = self._get("real-time/DX-Y.NYB")
        if dxy_data and "close" in dxy_data:
            indicators["dxy"] = float(dxy_data.get("close", 100))
        else:
            indicators["dxy"] = 100.0
        
        # VIX (Fear Index)
        vix_data = self._get("real-time/VIX.INDX")
        if vix_data and "close" in vix_data:
            indicators["vix"] = float(vix_data.get("close", 20))
        else:
            indicators["vix"] = 20.0
        
        # US 10Y Treasury (proxy)
        tnx_data = self._get("real-time/TNX.INDX")
        if tnx_data and "close" in tnx_data:
            indicators["us10y"] = float(tnx_data.get("close", 4.0))
        else:
            indicators["us10y"] = 4.0
        
        # Fed rate (hardcoded as it doesn't change often)
        indicators["fed_rate"] = 5.25
        
        return indicators
    
    def get_historical_data(self, symbol: str, days: int = 7) -> list:
        """
        Get historical daily data.
        
        Args:
            symbol: Symbol to fetch
            days: Number of days
            
        Returns:
            List of daily candles
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        data = self._get(
            f"eod/{symbol}.US",
            params={
                "from": start_date.strftime("%Y-%m-%d"),
                "to": end_date.strftime("%Y-%m-%d"),
            }
        )
        
        if isinstance(data, list):
            return data
        
        return []


class MarketDataCollector:
    """
    Main data collector that aggregates data from all sources.
    """
    
    def __init__(self):
        self.hyperliquid = HyperliquidAPI()
        self.eodhd = EODHD_API()
        
        # Cache for correlation calculations
        self._price_history = {}
        
        logger.info("MarketDataCollector initialized")
    
    def collect_market_data(self) -> dict:
        """
        Collect all market data needed for signal generation.
        
        Returns:
            Complete market data dictionary
        """
        logger.info("Starting market data collection...")
        
        data = {
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        }
        
        # Collect crypto data from Hyperliquid
        data.update(self._collect_crypto_data())
        
        # Collect metals data
        data.update(self._collect_metal_data())
        
        # Collect stock data
        data.update(self._collect_stock_data())
        
        # Collect macro indicators
        data.update(self._collect_macro_data())
        
        # Calculate correlations
        data.update(self._calculate_correlations())
        
        # Get market dominance
        data.update(self._get_dominance())
        
        logger.info("Market data collection complete")
        return data
    
    def _collect_crypto_data(self) -> dict:
        """Collect all crypto asset data."""
        logger.info("Collecting crypto data from Hyperliquid...")
        
        data = {}
        
        # Get all mid prices
        all_prices = self.hyperliquid.get_all_mids()
        
        # Get funding rates
        funding_rates = self.hyperliquid.get_funding_rates()
        
        for symbol in CRYPTO_ASSETS:
            symbol_lower = symbol.lower()
            
            # Price
            price = all_prices.get(symbol, 0)
            if price == 0:
                # Try with different formats
                price = all_prices.get(symbol.upper(), all_prices.get(f"{symbol}-USD", 0))
            
            data[f"{symbol_lower}_price"] = price
            
            # Momentum (4h)
            try:
                momentum = self.hyperliquid.calculate_momentum(symbol, hours=4)
            except Exception as e:
                logger.warning(f"Failed to get momentum for {symbol}: {e}")
                momentum = 0.0
            data[f"{symbol_lower}_mom"] = momentum
            
            # Volatility (7d)
            try:
                volatility = self.hyperliquid.calculate_volatility(symbol, days=7)
            except Exception as e:
                logger.warning(f"Failed to get volatility for {symbol}: {e}")
                volatility = 5.0  # Default crypto vol
            data[f"{symbol_lower}_vol"] = volatility
            
            # Funding rate
            funding = funding_rates.get(symbol, 0)
            data[f"{symbol_lower}_fund"] = funding
            
            # Sentiment (from fear/greed for crypto)
            if symbol == "BTC":
                sentiment = self.eodhd.get_fear_greed_index()
            else:
                # Derive from BTC with small random variation
                sentiment = data.get("btc_sent", 0) * 0.8
            data[f"{symbol_lower}_sent"] = sentiment
        
        return data
    
    def _collect_metal_data(self) -> dict:
        """Collect all metal/commodity data."""
        logger.info("Collecting metal data...")
        
        data = {}
        
        # Fallback prices if API fails
        fallback_prices = {
            "XAU": 2650.0,
            "XAG": 31.5,
            "XPT": 1025.0,
            "XPD": 985.0,
            "HG": 4.25,
        }
        
        for symbol in METAL_ASSETS:
            symbol_lower = symbol.lower()
            
            # Get price from EODHD
            commodity_data = self.eodhd.get_commodity_price(symbol)
            price = commodity_data.get("price", 0)
            
            if price == 0:
                price = fallback_prices.get(symbol, 0)
                logger.warning(f"Using fallback price for {symbol}: {price}")
            
            data[f"{symbol_lower}_price"] = price
            
            # Momentum (use change_percent if available, otherwise estimate)
            change_pct = commodity_data.get("change_percent", 0)
            data[f"{symbol_lower}_mom"] = change_pct / 4  # Rough 4h estimate
            
            # Volatility (metals are low vol)
            vol_estimates = {"XAU": 0.8, "XAG": 1.5, "XPT": 1.8, "XPD": 2.5, "HG": 1.2}
            data[f"{symbol_lower}_vol"] = vol_estimates.get(symbol, 1.0)
            
            # Funding (minimal for metals)
            data[f"{symbol_lower}_fund"] = 0.002  # Typical low funding
            
            # Sentiment (inverse to risk sentiment for precious metals)
            fear_greed = self.eodhd.get_fear_greed_index()
            if symbol in ["XAU", "XAG", "XPT"]:
                # Precious metals = inverse sentiment
                data[f"{symbol_lower}_sent"] = -fear_greed * 0.5
            else:
                # Industrial metals = follow growth
                data[f"{symbol_lower}_sent"] = fear_greed * 0.3
        
        return data
    
    def _collect_stock_data(self) -> dict:
        """Collect all stock data."""
        logger.info("Collecting stock data...")
        
        data = {}
        
        # Fallback prices
        fallback_prices = {
            "AAPL": 185.0, "NVDA": 875.0, "TSLA": 248.0, "MSFT": 415.0,
            "GOOGL": 142.0, "AMZN": 178.0, "META": 485.0, "AMD": 145.0,
        }
        
        for symbol in STOCK_ASSETS:
            symbol_lower = symbol.lower()
            
            # Get price from EODHD
            stock_data = self.eodhd.get_stock_price(symbol)
            price = stock_data.get("price", 0)
            
            if price == 0:
                price = fallback_prices.get(symbol, 0)
                logger.warning(f"Using fallback price for {symbol}: {price}")
            
            data[f"{symbol_lower}_price"] = price
            
            # Momentum
            change_pct = stock_data.get("change_percent", 0)
            data[f"{symbol_lower}_mom"] = change_pct / 4  # Rough 4h estimate
            
            # Volatility (tech stocks vary)
            vol_estimates = {
                "AAPL": 1.8, "NVDA": 3.5, "TSLA": 4.8, "MSFT": 1.5,
                "GOOGL": 2.0, "AMZN": 2.2, "META": 2.8, "AMD": 3.2,
            }
            data[f"{symbol_lower}_vol"] = vol_estimates.get(symbol, 2.5)
            
            # Sentiment
            sentiment = self.eodhd.get_sentiment(symbol)
            data[f"{symbol_lower}_sent"] = sentiment
        
        return data
    
    def _collect_macro_data(self) -> dict:
        """Collect macro economic indicators."""
        logger.info("Collecting macro indicators...")
        
        macro = self.eodhd.get_macro_indicators()
        
        return {
            "dxy": macro.get("dxy", 100.0),
            "us10y": macro.get("us10y", 4.0),
            "vix": macro.get("vix", 20.0),
            "fed_rate": macro.get("fed_rate", 5.25),
        }
    
    def _calculate_correlations(self) -> dict:
        """Calculate cross-asset correlations."""
        logger.info("Calculating correlations...")
        
        # These would ideally be calculated from historical data
        # For now, use reasonable estimates based on typical market behavior
        
        return {
            # Crypto/Metal correlations
            "corr_btc_xau": 0.35,
            "corr_btc_nvda": 0.62,
            "corr_xau_nvda": -0.15,
            "corr_eth_xag": 0.28,
            "corr_sol_tsla": 0.55,
            "corr_hg_amd": 0.42,
            
            # Intra-class correlations
            "corr_btc_eth": 0.88,
            "corr_xau_xag": 0.92,
            "corr_nvda_amd": 0.85,
        }
    
    def _get_dominance(self) -> dict:
        """Get market dominance metrics."""
        logger.info("Getting market dominance...")
        
        # These would ideally come from an API like CoinGecko
        # Using reasonable defaults
        return {
            "btc_dom": 52.0,
            "eth_dom": 17.5,
        }


def collect_all_market_data() -> dict:
    """
    Convenience function to collect all market data.
    
    Returns:
        Complete market data dictionary
    """
    collector = MarketDataCollector()
    return collector.collect_market_data()


# =============================================================================
# TESTING
# =============================================================================

if __name__ == "__main__":
    import json
    
    print("=" * 60)
    print("RATIO BOT - DATA COLLECTOR TEST")
    print("=" * 60)
    
    collector = MarketDataCollector()
    
    print("\n--- Testing Hyperliquid API ---")
    
    # Test mid prices
    print("Fetching all mid prices...")
    prices = collector.hyperliquid.get_all_mids()
    print(f"Got {len(prices)} prices")
    for symbol in ["BTC", "ETH", "SOL"]:
        print(f"  {symbol}: ${prices.get(symbol, 'N/A')}")
    
    # Test funding rates
    print("\nFetching funding rates...")
    funding = collector.hyperliquid.get_funding_rates()
    print(f"Got {len(funding)} funding rates")
    for symbol in ["BTC", "ETH", "SOL"]:
        print(f"  {symbol}: {funding.get(symbol, 'N/A')}%")
    
    print("\n--- Testing Full Data Collection ---")
    
    # Full collection
    print("Collecting all market data (this may take a moment)...")
    market_data = collector.collect_market_data()
    
    print(f"\nCollected {len(market_data)} data points")
    
    # Show sample data
    print("\n--- Sample Prices ---")
    for asset_type, assets in [("Crypto", CRYPTO_ASSETS[:3]), 
                               ("Metals", METAL_ASSETS[:3]), 
                               ("Stocks", STOCK_ASSETS[:3])]:
        print(f"\n{asset_type}:")
        for symbol in assets:
            key = f"{symbol.lower()}_price"
            print(f"  {symbol}: ${market_data.get(key, 'N/A')}")
    
    print("\n--- Sample Momentum (4h) ---")
    for symbol in ["BTC", "ETH", "XAU", "NVDA"]:
        key = f"{symbol.lower()}_mom"
        print(f"  {symbol}: {market_data.get(key, 'N/A'):+.2f}%")
    
    print("\n--- Macro Indicators ---")
    print(f"  DXY: {market_data.get('dxy', 'N/A')}")
    print(f"  US 10Y: {market_data.get('us10y', 'N/A')}%")
    print(f"  VIX: {market_data.get('vix', 'N/A')}")
    
    print("\n--- Full Data (JSON) ---")
    # Show first 20 items
    items = list(market_data.items())[:20]
    for key, value in items:
        print(f"  {key}: {value}")
    print(f"  ... and {len(market_data) - 20} more items")

