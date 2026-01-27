"""
Pear Protocol Agent API Client
Fetches trading signals from https://api.pear.garden/watchlist
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import httpx

logger = logging.getLogger(__name__)


class PearAgentAPI:
    """Client for Pear Protocol Agent API"""
    
    API_BASE = "https://api.pear.garden"
    
    def __init__(self, api_key: str):
        """
        Initialize with API key.
        
        Args:
            api_key: Pear Protocol API key
        """
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    async def fetch_watchlist(self) -> List[Dict[str, Any]]:
        """
        Fetch signals from Pear Agent watchlist.
        
        Returns:
            List of signal objects from the API
        """
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.API_BASE}/watchlist",
                    headers=self.headers
                )
                
                if response.status_code == 401:
                    logger.error("[PearAPI] ❌ Authentication failed - check API key")
                    return []
                
                if response.status_code == 403:
                    logger.error("[PearAPI] ❌ Forbidden - API key may not have access")
                    return []
                
                if response.status_code != 200:
                    logger.error(f"[PearAPI] ❌ API error: {response.status_code}")
                    return []
                
                data = response.json()
                logger.info(f"[PearAPI] ✅ Fetched {len(data) if isinstance(data, list) else 1} signals")
                return data if isinstance(data, list) else [data]
                
        except httpx.TimeoutException:
            logger.error("[PearAPI] ❌ Request timeout")
            return []
        except Exception as e:
            logger.error(f"[PearAPI] ❌ Error: {e}")
            return []
    
    def convert_signal_to_trade_format(self, signal: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert Pear API signal to the format expected by the trading bot.
        
        Args:
            signal: Raw signal from Pear API with fields:
                - long_asset: str
                - short_asset: str
                - spread: float
                - z_score: float
                - correlation: float
                - timestamp: str
                - id: str
        
        Returns:
            Signal in bot-compatible format
        """
        long_asset = signal.get("long_asset", "BTC").replace("-PERP", "")
        short_asset = signal.get("short_asset", "ETH").replace("-PERP", "")
        z_score = float(signal.get("z_score", 0))
        correlation = float(signal.get("correlation", 0))
        spread = float(signal.get("spread", 0))
        
        # Calculate confidence from z_score (higher z = stronger signal)
        # Z-score of 2+ is typically considered strong
        confidence = min(10, max(1, abs(z_score) * 3 + 4))
        
        # Dynamic TP/SL based on z_score and correlation
        # Higher z-score = larger expected move
        base_tp = 10 + abs(z_score) * 3
        base_sl = 5 + abs(z_score) * 1.5
        
        # Adjust for correlation (higher correlation = more predictable)
        if correlation > 0.7:
            base_sl *= 0.8  # Tighter SL for high correlation pairs
        
        # Clamp values
        tp_pct = max(5, min(30, base_tp))
        sl_pct = max(3, min(15, base_sl))
        
        # Generate thesis
        direction = "bullish" if z_score > 0 else "bearish"
        thesis = (
            f"Pear Agent Signal: {long_asset}/{short_asset} pair showing {direction} divergence. "
            f"Z-Score: {z_score:.2f}, Correlation: {correlation:.2f}, Spread: {spread:.4f}. "
            f"Statistical arbitrage opportunity detected."
        )
        
        return {
            "trade_type": "PAIR",
            "basket_category": "PEAR_AGENT_SIGNAL",
            "long_basket": [{"coin": long_asset, "weight": 1.0}],
            "short_basket": [{"coin": short_asset, "weight": 1.0}],
            "confidence": round(confidence, 1),
            "thesis": thesis,
            "position_sizing": {
                "recommended_sl_percent": round(sl_pct, 1),
                "recommended_tp_percent": round(tp_pct, 1),
                "risk_reward_ratio": round(tp_pct / sl_pct, 2)
            },
            "factor_analysis": {
                "z_score": round(z_score, 2),
                "correlation": round(correlation, 4),
                "spread": round(spread, 6),
                "momentum_divergence": int(min(10, abs(z_score) * 3)),
                "correlation_quality": int(correlation * 10),
                "overall_confluence": int(confidence)
            },
            "pear_signal_id": signal.get("id"),
            "pear_timestamp": signal.get("timestamp"),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model": "pear-agent-api"
        }
    
    async def get_latest_signal(self) -> Optional[Dict[str, Any]]:
        """
        Get the latest trading signal from Pear Agent.
        
        Returns:
            Signal in bot-compatible format, or None if unavailable
        """
        signals = await self.fetch_watchlist()
        
        if not signals:
            logger.warning("[PearAPI] ⚠️ No signals available")
            return None
        
        # Get the first/latest signal
        latest_signal = signals[0]
        
        logger.info(f"[PearAPI] 📊 Latest signal: {latest_signal.get('long_asset')}/{latest_signal.get('short_asset')}")
        logger.info(f"[PearAPI] Z-Score: {latest_signal.get('z_score')}, Correlation: {latest_signal.get('correlation')}")
        
        return self.convert_signal_to_trade_format(latest_signal)
    
    async def get_all_signals(self) -> List[Dict[str, Any]]:
        """
        Get all available signals from Pear Agent.
        
        Returns:
            List of signals in bot-compatible format
        """
        raw_signals = await self.fetch_watchlist()
        return [self.convert_signal_to_trade_format(s) for s in raw_signals]


# Singleton instance
_pear_api_instance: Optional[PearAgentAPI] = None


def get_pear_api(api_key: str) -> PearAgentAPI:
    """Get or create Pear API client instance"""
    global _pear_api_instance
    if _pear_api_instance is None or _pear_api_instance.api_key != api_key:
        _pear_api_instance = PearAgentAPI(api_key)
    return _pear_api_instance


async def fetch_pear_agent_signal(api_key: str) -> Optional[Dict[str, Any]]:
    """Convenience function to fetch latest signal"""
    api = get_pear_api(api_key)
    return await api.get_latest_signal()
