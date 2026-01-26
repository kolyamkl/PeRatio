"""
Comprehensive tests for Pear Protocol Agent API Client
Run with: python test_pear_api.py
Or with pytest: pytest test_pear_api.py -v
"""
import asyncio
import os
import sys
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
from unittest.mock import AsyncMock, patch, MagicMock

# Configure logging for tests
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pear_agent_api import PearAgentAPI, get_pear_api, fetch_pear_agent_signal


# =============================================================================
# MOCK DATA - Simulates Pear API responses
# =============================================================================

MOCK_WATCHLIST_RESPONSE = [
    {
        "id": "signal_001",
        "long_asset": "BTC",
        "short_asset": "ETH",
        "spread": 0.0234,
        "z_score": 2.15,
        "correlation": 0.85,
        "timestamp": "2026-01-26T15:00:00Z"
    },
    {
        "id": "signal_002",
        "long_asset": "SOL",
        "short_asset": "ARB",
        "spread": 0.0156,
        "z_score": -1.8,
        "correlation": 0.72,
        "timestamp": "2026-01-26T14:55:00Z"
    },
    {
        "id": "signal_003",
        "long_asset": "DOGE",
        "short_asset": "OP",
        "spread": 0.0089,
        "z_score": 1.45,
        "correlation": 0.68,
        "timestamp": "2026-01-26T14:50:00Z"
    }
]


# =============================================================================
# UNIT TESTS
# =============================================================================

class TestPearAgentAPI:
    """Unit tests for PearAgentAPI class"""
    
    def __init__(self):
        self.api = PearAgentAPI("test_api_key_123")
        self.tests_passed = 0
        self.tests_failed = 0
    
    def assert_equal(self, actual, expected, message: str = ""):
        """Assert two values are equal"""
        if actual == expected:
            self.tests_passed += 1
            logger.info(f"  ✅ PASS: {message}")
        else:
            self.tests_failed += 1
            logger.error(f"  ❌ FAIL: {message}")
            logger.error(f"     Expected: {expected}")
            logger.error(f"     Actual: {actual}")
    
    def assert_true(self, condition: bool, message: str = ""):
        """Assert condition is true"""
        if condition:
            self.tests_passed += 1
            logger.info(f"  ✅ PASS: {message}")
        else:
            self.tests_failed += 1
            logger.error(f"  ❌ FAIL: {message}")
    
    def assert_in_range(self, value: float, min_val: float, max_val: float, message: str = ""):
        """Assert value is within range"""
        if min_val <= value <= max_val:
            self.tests_passed += 1
            logger.info(f"  ✅ PASS: {message} (value={value})")
        else:
            self.tests_failed += 1
            logger.error(f"  ❌ FAIL: {message}")
            logger.error(f"     Expected range: [{min_val}, {max_val}]")
            logger.error(f"     Actual value: {value}")
    
    def test_api_initialization(self):
        """Test API client initialization"""
        logger.info("\n📋 Test: API Initialization")
        
        api = PearAgentAPI("my_test_key")
        
        self.assert_equal(api.api_key, "my_test_key", "API key stored correctly")
        self.assert_equal(api.API_BASE, "https://api.pear.garden", "API base URL correct")
        self.assert_true("Authorization" in api.headers, "Authorization header present")
        self.assert_equal(api.headers["Authorization"], "Bearer my_test_key", "Bearer token format correct")
        self.assert_equal(api.headers["Content-Type"], "application/json", "Content-Type header correct")
    
    def test_signal_conversion_positive_zscore(self):
        """Test signal conversion with positive z-score (bullish)"""
        logger.info("\n📋 Test: Signal Conversion (Positive Z-Score)")
        
        raw_signal = {
            "id": "test_001",
            "long_asset": "BTC",
            "short_asset": "ETH",
            "spread": 0.025,
            "z_score": 2.0,
            "correlation": 0.85,
            "timestamp": "2026-01-26T12:00:00Z"
        }
        
        converted = self.api.convert_signal_to_trade_format(raw_signal)
        
        self.assert_equal(converted["trade_type"], "PAIR", "Trade type is PAIR")
        self.assert_equal(converted["basket_category"], "PEAR_AGENT_SIGNAL", "Category correct")
        self.assert_equal(converted["long_basket"][0]["coin"], "BTC", "Long asset is BTC")
        self.assert_equal(converted["short_basket"][0]["coin"], "ETH", "Short asset is ETH")
        self.assert_equal(converted["long_basket"][0]["weight"], 1.0, "Long weight is 1.0")
        self.assert_equal(converted["short_basket"][0]["weight"], 1.0, "Short weight is 1.0")
        self.assert_in_range(converted["confidence"], 1, 10, "Confidence in valid range")
        self.assert_true("bullish" in converted["thesis"], "Thesis mentions bullish for positive z-score")
        self.assert_equal(converted["pear_signal_id"], "test_001", "Signal ID preserved")
        self.assert_equal(converted["model"], "pear-agent-api", "Model identifier correct")
    
    def test_signal_conversion_negative_zscore(self):
        """Test signal conversion with negative z-score (bearish)"""
        logger.info("\n📋 Test: Signal Conversion (Negative Z-Score)")
        
        raw_signal = {
            "id": "test_002",
            "long_asset": "SOL",
            "short_asset": "ARB",
            "spread": 0.015,
            "z_score": -1.5,
            "correlation": 0.70,
            "timestamp": "2026-01-26T12:00:00Z"
        }
        
        converted = self.api.convert_signal_to_trade_format(raw_signal)
        
        self.assert_equal(converted["long_basket"][0]["coin"], "SOL", "Long asset is SOL")
        self.assert_equal(converted["short_basket"][0]["coin"], "ARB", "Short asset is ARB")
        self.assert_true("bearish" in converted["thesis"], "Thesis mentions bearish for negative z-score")
        self.assert_in_range(converted["confidence"], 1, 10, "Confidence in valid range")
    
    def test_position_sizing_calculation(self):
        """Test TP/SL calculation based on z-score"""
        logger.info("\n📋 Test: Position Sizing Calculation")
        
        # High z-score signal
        high_z_signal = {
            "id": "test_high",
            "long_asset": "BTC",
            "short_asset": "ETH",
            "spread": 0.03,
            "z_score": 3.0,
            "correlation": 0.80,
            "timestamp": "2026-01-26T12:00:00Z"
        }
        
        converted = self.api.convert_signal_to_trade_format(high_z_signal)
        pos_sizing = converted["position_sizing"]
        
        self.assert_in_range(pos_sizing["recommended_sl_percent"], 3, 15, "SL within 3-15% range")
        self.assert_in_range(pos_sizing["recommended_tp_percent"], 5, 30, "TP within 5-30% range")
        self.assert_true(pos_sizing["risk_reward_ratio"] > 0, "Risk/reward ratio is positive")
        
        # Low z-score signal
        low_z_signal = {
            "id": "test_low",
            "long_asset": "DOGE",
            "short_asset": "OP",
            "spread": 0.01,
            "z_score": 0.5,
            "correlation": 0.60,
            "timestamp": "2026-01-26T12:00:00Z"
        }
        
        converted_low = self.api.convert_signal_to_trade_format(low_z_signal)
        pos_sizing_low = converted_low["position_sizing"]
        
        self.assert_in_range(pos_sizing_low["recommended_sl_percent"], 3, 15, "Low-z SL within range")
        self.assert_in_range(pos_sizing_low["recommended_tp_percent"], 5, 30, "Low-z TP within range")
    
    def test_high_correlation_adjustment(self):
        """Test that high correlation adjusts SL tighter"""
        logger.info("\n📋 Test: High Correlation SL Adjustment")
        
        high_corr_signal = {
            "id": "test_corr",
            "long_asset": "BTC",
            "short_asset": "ETH",
            "spread": 0.02,
            "z_score": 2.0,
            "correlation": 0.85,  # High correlation
            "timestamp": "2026-01-26T12:00:00Z"
        }
        
        low_corr_signal = {
            "id": "test_corr2",
            "long_asset": "BTC",
            "short_asset": "ETH",
            "spread": 0.02,
            "z_score": 2.0,
            "correlation": 0.50,  # Low correlation
            "timestamp": "2026-01-26T12:00:00Z"
        }
        
        high_converted = self.api.convert_signal_to_trade_format(high_corr_signal)
        low_converted = self.api.convert_signal_to_trade_format(low_corr_signal)
        
        high_sl = high_converted["position_sizing"]["recommended_sl_percent"]
        low_sl = low_converted["position_sizing"]["recommended_sl_percent"]
        
        self.assert_true(high_sl <= low_sl, f"High correlation has tighter SL ({high_sl}% <= {low_sl}%)")
    
    def test_factor_analysis_output(self):
        """Test factor analysis fields in converted signal"""
        logger.info("\n📋 Test: Factor Analysis Output")
        
        raw_signal = {
            "id": "test_factors",
            "long_asset": "BTC",
            "short_asset": "ETH",
            "spread": 0.0234,
            "z_score": 2.15,
            "correlation": 0.85,
            "timestamp": "2026-01-26T12:00:00Z"
        }
        
        converted = self.api.convert_signal_to_trade_format(raw_signal)
        factors = converted["factor_analysis"]
        
        self.assert_equal(factors["z_score"], 2.15, "Z-score preserved")
        self.assert_equal(factors["correlation"], 0.85, "Correlation preserved")
        self.assert_equal(factors["spread"], 0.0234, "Spread preserved")
        self.assert_true("momentum_divergence" in factors, "Momentum divergence calculated")
        self.assert_true("correlation_quality" in factors, "Correlation quality calculated")
        self.assert_true("overall_confluence" in factors, "Overall confluence calculated")
    
    def test_asset_name_cleaning(self):
        """Test that -PERP suffix is removed from asset names"""
        logger.info("\n📋 Test: Asset Name Cleaning")
        
        raw_signal = {
            "id": "test_clean",
            "long_asset": "BTC-PERP",
            "short_asset": "ETH-PERP",
            "spread": 0.02,
            "z_score": 1.5,
            "correlation": 0.75,
            "timestamp": "2026-01-26T12:00:00Z"
        }
        
        converted = self.api.convert_signal_to_trade_format(raw_signal)
        
        self.assert_equal(converted["long_basket"][0]["coin"], "BTC", "-PERP removed from long asset")
        self.assert_equal(converted["short_basket"][0]["coin"], "ETH", "-PERP removed from short asset")
    
    def test_default_values(self):
        """Test default values when fields are missing"""
        logger.info("\n📋 Test: Default Values")
        
        minimal_signal = {
            "id": "test_minimal"
        }
        
        converted = self.api.convert_signal_to_trade_format(minimal_signal)
        
        self.assert_equal(converted["long_basket"][0]["coin"], "BTC", "Default long asset is BTC")
        self.assert_equal(converted["short_basket"][0]["coin"], "ETH", "Default short asset is ETH")
        self.assert_in_range(converted["confidence"], 1, 10, "Default confidence in range")


# =============================================================================
# ASYNC TESTS (with mocking)
# =============================================================================

class TestPearAgentAPIAsync:
    """Async tests for PearAgentAPI with mocked HTTP responses"""
    
    def __init__(self):
        self.tests_passed = 0
        self.tests_failed = 0
    
    def assert_equal(self, actual, expected, message: str = ""):
        if actual == expected:
            self.tests_passed += 1
            logger.info(f"  ✅ PASS: {message}")
        else:
            self.tests_failed += 1
            logger.error(f"  ❌ FAIL: {message} (expected={expected}, actual={actual})")
    
    def assert_true(self, condition: bool, message: str = ""):
        if condition:
            self.tests_passed += 1
            logger.info(f"  ✅ PASS: {message}")
        else:
            self.tests_failed += 1
            logger.error(f"  ❌ FAIL: {message}")
    
    async def test_fetch_watchlist_success(self):
        """Test successful watchlist fetch"""
        logger.info("\n📋 Test: Fetch Watchlist (Success)")
        
        api = PearAgentAPI("test_key")
        
        # Mock the httpx response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = MOCK_WATCHLIST_RESPONSE
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.return_value = mock_response
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance
            
            signals = await api.fetch_watchlist()
        
        self.assert_equal(len(signals), 3, "Fetched 3 signals")
        self.assert_equal(signals[0]["long_asset"], "BTC", "First signal long asset is BTC")
        self.assert_equal(signals[0]["short_asset"], "ETH", "First signal short asset is ETH")
    
    async def test_fetch_watchlist_auth_failure(self):
        """Test watchlist fetch with auth failure"""
        logger.info("\n📋 Test: Fetch Watchlist (Auth Failure)")
        
        api = PearAgentAPI("bad_key")
        
        mock_response = MagicMock()
        mock_response.status_code = 401
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.return_value = mock_response
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance
            
            signals = await api.fetch_watchlist()
        
        self.assert_equal(len(signals), 0, "Returns empty list on auth failure")
    
    async def test_fetch_watchlist_timeout(self):
        """Test watchlist fetch with timeout"""
        logger.info("\n📋 Test: Fetch Watchlist (Timeout)")
        
        api = PearAgentAPI("test_key")
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.side_effect = Exception("Timeout")
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance
            
            signals = await api.fetch_watchlist()
        
        self.assert_equal(len(signals), 0, "Returns empty list on timeout")
    
    async def test_get_latest_signal(self):
        """Test getting latest signal"""
        logger.info("\n📋 Test: Get Latest Signal")
        
        api = PearAgentAPI("test_key")
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = MOCK_WATCHLIST_RESPONSE
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.return_value = mock_response
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance
            
            signal = await api.get_latest_signal()
        
        self.assert_true(signal is not None, "Signal returned")
        self.assert_equal(signal["long_basket"][0]["coin"], "BTC", "Latest signal long is BTC")
        self.assert_equal(signal["short_basket"][0]["coin"], "ETH", "Latest signal short is ETH")
        self.assert_equal(signal["basket_category"], "PEAR_AGENT_SIGNAL", "Category correct")
    
    async def test_get_latest_signal_empty(self):
        """Test getting latest signal when no signals available"""
        logger.info("\n📋 Test: Get Latest Signal (Empty)")
        
        api = PearAgentAPI("test_key")
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = []
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.return_value = mock_response
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance
            
            signal = await api.get_latest_signal()
        
        self.assert_true(signal is None, "Returns None when no signals")
    
    async def test_get_all_signals(self):
        """Test getting all signals"""
        logger.info("\n📋 Test: Get All Signals")
        
        api = PearAgentAPI("test_key")
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = MOCK_WATCHLIST_RESPONSE
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.return_value = mock_response
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance
            
            signals = await api.get_all_signals()
        
        self.assert_equal(len(signals), 3, "All 3 signals converted")
        self.assert_true(all(s["trade_type"] == "PAIR" for s in signals), "All signals are PAIR type")
    
    async def test_convenience_function(self):
        """Test fetch_pear_agent_signal convenience function"""
        logger.info("\n📋 Test: Convenience Function")
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = MOCK_WATCHLIST_RESPONSE
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.return_value = mock_response
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance
            
            signal = await fetch_pear_agent_signal("test_key")
        
        self.assert_true(signal is not None, "Convenience function returns signal")


# =============================================================================
# LIVE API TEST (optional - requires real API key)
# =============================================================================

async def test_live_api():
    """
    Test against the live Pear API.
    Only runs if PEAR_AGENT_API_KEY is set in environment.
    """
    from dotenv import load_dotenv
    load_dotenv()
    
    api_key = os.getenv("PEAR_AGENT_API_KEY", "")
    
    if not api_key or api_key == "your_api_key_here":
        logger.warning("\n⚠️ LIVE API TEST SKIPPED: Set PEAR_AGENT_API_KEY in .env to run")
        return None
    
    logger.info("\n" + "=" * 60)
    logger.info("🌐 LIVE API TEST")
    logger.info("=" * 60)
    
    api = PearAgentAPI(api_key)
    
    logger.info(f"\n📡 Testing connection to {api.API_BASE}/watchlist...")
    
    signals = await api.fetch_watchlist()
    
    if not signals:
        logger.error("❌ No signals returned from live API")
        logger.error("   Check your API key or API status")
        return False
    
    logger.info(f"✅ Received {len(signals)} signals from live API")
    
    for i, signal in enumerate(signals[:3]):
        logger.info(f"\n📊 Signal {i+1}:")
        logger.info(f"   ID: {signal.get('id')}")
        logger.info(f"   Long: {signal.get('long_asset')}")
        logger.info(f"   Short: {signal.get('short_asset')}")
        logger.info(f"   Z-Score: {signal.get('z_score')}")
        logger.info(f"   Correlation: {signal.get('correlation')}")
        logger.info(f"   Spread: {signal.get('spread')}")
    
    # Test conversion
    logger.info("\n🔄 Testing signal conversion...")
    converted = await api.get_latest_signal()
    
    if converted:
        logger.info(f"\n✅ Converted signal:")
        logger.info(f"   Long Basket: {converted['long_basket']}")
        logger.info(f"   Short Basket: {converted['short_basket']}")
        logger.info(f"   Confidence: {converted['confidence']}/10")
        logger.info(f"   TP: {converted['position_sizing']['recommended_tp_percent']}%")
        logger.info(f"   SL: {converted['position_sizing']['recommended_sl_percent']}%")
        logger.info(f"   R:R: {converted['position_sizing']['risk_reward_ratio']}")
        logger.info(f"   Thesis: {converted['thesis'][:80]}...")
        return True
    
    return False


# =============================================================================
# TEST RUNNER
# =============================================================================

async def run_all_tests():
    """Run all tests and report results"""
    
    print("\n" + "=" * 60)
    print("🧪 PEAR AGENT API TEST SUITE")
    print("=" * 60)
    
    total_passed = 0
    total_failed = 0
    
    # Unit Tests
    print("\n" + "-" * 40)
    print("📦 UNIT TESTS")
    print("-" * 40)
    
    unit_tests = TestPearAgentAPI()
    unit_tests.test_api_initialization()
    unit_tests.test_signal_conversion_positive_zscore()
    unit_tests.test_signal_conversion_negative_zscore()
    unit_tests.test_position_sizing_calculation()
    unit_tests.test_high_correlation_adjustment()
    unit_tests.test_factor_analysis_output()
    unit_tests.test_asset_name_cleaning()
    unit_tests.test_default_values()
    
    total_passed += unit_tests.tests_passed
    total_failed += unit_tests.tests_failed
    
    # Async Tests
    print("\n" + "-" * 40)
    print("⚡ ASYNC TESTS (with mocking)")
    print("-" * 40)
    
    async_tests = TestPearAgentAPIAsync()
    await async_tests.test_fetch_watchlist_success()
    await async_tests.test_fetch_watchlist_auth_failure()
    await async_tests.test_fetch_watchlist_timeout()
    await async_tests.test_get_latest_signal()
    await async_tests.test_get_latest_signal_empty()
    await async_tests.test_get_all_signals()
    await async_tests.test_convenience_function()
    
    total_passed += async_tests.tests_passed
    total_failed += async_tests.tests_failed
    
    # Live API Test (optional)
    await test_live_api()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"   ✅ Passed: {total_passed}")
    print(f"   ❌ Failed: {total_failed}")
    print(f"   📈 Success Rate: {total_passed / (total_passed + total_failed) * 100:.1f}%")
    print("=" * 60)
    
    if total_failed == 0:
        print("\n🎉 ALL TESTS PASSED!")
    else:
        print(f"\n⚠️ {total_failed} test(s) failed. Please review the errors above.")
    
    return total_failed == 0


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
