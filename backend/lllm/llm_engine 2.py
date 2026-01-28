"""
RATIO Bot LLM Engine
====================
Handles all LLM interactions with OpenAI GPT-4o-mini for signal generation.
"""

import json
import logging
from typing import Optional
from datetime import datetime

import backoff
import openai
from openai import OpenAI

from lllm_config import (
    OPENAI_API_KEY,
    LLM_MODEL,
    LLM_TEMPERATURE,
    LLM_MAX_TOKENS,
    LLM_MAX_RETRIES,
    CONFIDENCE_THRESHOLD,
    ALL_ASSETS,
    MIN_SL_PERCENT,
    MAX_SL_PERCENT,
    MIN_TP_PERCENT,
    MAX_TP_PERCENT,
    MAX_ASSETS_PER_SIDE,
)
from prompts import SYSTEM_PROMPT, format_signal_prompt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LLMEngine:
    """
    LLM Engine for generating trading signals using GPT-4o-mini.
    
    Features:
    - Exponential backoff retry for rate limits
    - Signal validation
    - Confidence threshold filtering
    - Structured JSON output
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the LLM Engine.
        
        Args:
            api_key: OpenAI API key. If None, uses OPENAI_API_KEY from config.
        """
        self.api_key = api_key or OPENAI_API_KEY
        
        if not self.api_key:
            raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY in .env")
        
        self.client = OpenAI(api_key=self.api_key)
        self.model = LLM_MODEL
        self.temperature = LLM_TEMPERATURE
        self.max_tokens = LLM_MAX_TOKENS
        
        logger.info(f"LLM Engine initialized with model: {self.model}")
    
    @backoff.on_exception(
        backoff.expo,
        (openai.RateLimitError, openai.APITimeoutError, openai.APIConnectionError),
        max_tries=LLM_MAX_RETRIES,
        jitter=backoff.full_jitter
    )
    def _call_api(self, system_prompt: str, user_prompt: str) -> str:
        """
        Call the OpenAI API with retry logic.
        
        Args:
            system_prompt: The system prompt defining the AI's role
            user_prompt: The user prompt with market data
            
        Returns:
            The LLM response content as a string
        """
        logger.debug("Calling OpenAI API...")
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        
        # Log token usage
        usage = response.usage
        logger.info(
            f"API call complete. Tokens: {usage.prompt_tokens} prompt, "
            f"{usage.completion_tokens} completion, {usage.total_tokens} total"
        )
        
        return content
    
    def generate_signal(self, market_data: dict) -> dict:
        """
        Generate a trading signal from market data.
        
        Args:
            market_data: Dictionary containing all market data
            
        Returns:
            Trading signal dictionary with basket recommendations
        """
        logger.info("Generating trading signal...")
        
        # Format the prompt with market data
        user_prompt = format_signal_prompt(market_data)
        
        # Call the API
        response_text = self._call_api(SYSTEM_PROMPT, user_prompt)
        
        # Parse JSON response
        try:
            signal = json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            logger.error(f"Response was: {response_text[:500]}...")
            raise ValueError(f"Invalid JSON response from LLM: {e}")
        
        # Add metadata
        signal["generated_at"] = datetime.utcnow().isoformat()
        signal["model"] = self.model
        
        logger.info(f"Signal generated: {signal.get('basket_category', 'UNKNOWN')} "
                   f"with confidence {signal.get('confidence', 0)}/10")
        
        return signal
    
    def validate_signal(self, signal: dict) -> tuple[bool, list[str]]:
        """
        Validate a trading signal for correctness.
        
        Args:
            signal: The signal dictionary to validate
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        # Check required fields
        required_fields = [
            "trade_type", "basket_category", "long_basket", "short_basket",
            "confidence", "thesis", "position_sizing", "factor_analysis",
            "execution_recommendation", "weighting_method"
        ]
        
        for field in required_fields:
            if field not in signal:
                errors.append(f"Missing required field: {field}")
        
        if errors:
            return False, errors
        
        # Validate baskets
        for basket_name in ["long_basket", "short_basket"]:
            basket = signal.get(basket_name, [])
            
            if not basket:
                errors.append(f"{basket_name} is empty")
                continue
            
            if len(basket) > MAX_ASSETS_PER_SIDE:
                errors.append(f"{basket_name} has more than {MAX_ASSETS_PER_SIDE} assets")
            
            # Check symbols
            for item in basket:
                if "coin" not in item or "weight" not in item:
                    errors.append(f"Invalid basket item in {basket_name}: {item}")
                    continue
                
                if item["coin"] not in ALL_ASSETS:
                    errors.append(f"Invalid symbol in {basket_name}: {item['coin']}")
                
                if not 0 < item["weight"] <= 1:
                    errors.append(f"Invalid weight in {basket_name}: {item['weight']}")
            
            # Check weights sum to 1.0
            total_weight = sum(item.get("weight", 0) for item in basket)
            if abs(total_weight - 1.0) > 0.01:
                errors.append(f"{basket_name} weights sum to {total_weight:.2f}, not 1.0")
        
        # Validate confidence
        confidence = signal.get("confidence", -1)
        if not 0 <= confidence <= 10:
            errors.append(f"Confidence {confidence} not in range 0-10")
        
        # Validate position sizing
        pos_sizing = signal.get("position_sizing", {})
        sl = pos_sizing.get("recommended_sl_percent", 0)
        tp = pos_sizing.get("recommended_tp_percent", 0)
        
        if not MIN_SL_PERCENT <= sl <= MAX_SL_PERCENT:
            errors.append(f"SL {sl}% not in range {MIN_SL_PERCENT}-{MAX_SL_PERCENT}%")
        
        if not MIN_TP_PERCENT <= tp <= MAX_TP_PERCENT:
            errors.append(f"TP {tp}% not in range {MIN_TP_PERCENT}-{MAX_TP_PERCENT}%")
        
        if tp <= sl:
            errors.append(f"TP ({tp}%) must be greater than SL ({sl}%)")
        
        # Validate execution recommendation
        if signal.get("execution_recommendation") not in ["MARKET", "TWAP"]:
            errors.append(f"Invalid execution_recommendation: {signal.get('execution_recommendation')}")
        
        # Validate weighting method
        if signal.get("weighting_method") not in ["equal", "volatility", "conviction"]:
            errors.append(f"Invalid weighting_method: {signal.get('weighting_method')}")
        
        is_valid = len(errors) == 0
        
        if is_valid:
            logger.info("Signal validation passed")
        else:
            logger.warning(f"Signal validation failed with {len(errors)} errors")
            for error in errors:
                logger.warning(f"  - {error}")
        
        return is_valid, errors
    
    def should_trade(self, signal: dict, threshold: Optional[float] = None) -> bool:
        """
        Determine if a signal meets the confidence threshold for trading.
        
        Args:
            signal: The validated signal dictionary
            threshold: Confidence threshold (default: CONFIDENCE_THRESHOLD from config)
            
        Returns:
            True if signal should be traded, False otherwise
        """
        threshold = threshold or CONFIDENCE_THRESHOLD
        confidence = signal.get("confidence", 0)
        
        should = confidence >= threshold
        
        if should:
            logger.info(f"Signal APPROVED for trading (confidence {confidence} >= {threshold})")
        else:
            logger.info(f"Signal REJECTED (confidence {confidence} < {threshold})")
        
        return should
    
    def format_signal_summary(self, signal: dict) -> str:
        """
        Format a human-readable summary of the signal.
        
        Args:
            signal: The signal dictionary
            
        Returns:
            Formatted string summary
        """
        long_basket = signal.get("long_basket", [])
        short_basket = signal.get("short_basket", [])
        
        long_str = " + ".join([f"{a['coin']} ({a['weight']*100:.0f}%)" for a in long_basket])
        short_str = " + ".join([f"{a['coin']} ({a['weight']*100:.0f}%)" for a in short_basket])
        
        pos = signal.get("position_sizing", {})
        factors = signal.get("factor_analysis", {})
        
        summary = f"""
╔══════════════════════════════════════════════════════════════╗
║                    RATIO BOT SIGNAL                          ║
╠══════════════════════════════════════════════════════════════╣
║ Category: {signal.get('basket_category', 'UNKNOWN'):<48} ║
║ Confidence: {signal.get('confidence', 0)}/10                                          ║
╠══════════════════════════════════════════════════════════════╣
║ LONG:  {long_str:<53} ║
║ SHORT: {short_str:<53} ║
╠══════════════════════════════════════════════════════════════╣
║ Stop Loss: {pos.get('recommended_sl_percent', 0)}%    Take Profit: {pos.get('recommended_tp_percent', 0)}%    R:R {pos.get('risk_reward_ratio', 0):.1f}:1 ║
╠══════════════════════════════════════════════════════════════╣
║ Thesis: {signal.get('thesis', 'N/A')[:52]:<52} ║
╠══════════════════════════════════════════════════════════════╣
║ Factors:                                                     ║
║   Momentum: {factors.get('momentum_divergence', 0)}/10  Sector: {factors.get('sector_rotation_signal', 0)}/10  Macro: {factors.get('macro_alignment', 0)}/10  ║
║   Vol Match: {factors.get('volatility_match', 0)}/10  Corr: {factors.get('correlation_quality', 0)}/10  Overall: {factors.get('overall_confluence', 0)}/10 ║
╠══════════════════════════════════════════════════════════════╣
║ Execution: {signal.get('execution_recommendation', 'MARKET'):<10}  Weighting: {signal.get('weighting_method', 'equal'):<20} ║
╚══════════════════════════════════════════════════════════════╝
"""
        return summary


def generate_signal_from_data(market_data: dict) -> Optional[dict]:
    """
    Convenience function to generate and validate a signal.
    
    Args:
        market_data: Dictionary containing all market data
        
    Returns:
        Validated signal if successful and meets threshold, None otherwise
    """
    engine = LLMEngine()
    
    # Generate signal
    signal = engine.generate_signal(market_data)
    
    # Validate
    is_valid, errors = engine.validate_signal(signal)
    if not is_valid:
        logger.error(f"Signal validation failed: {errors}")
        return None
    
    # Check threshold
    if not engine.should_trade(signal):
        logger.info("Signal below confidence threshold - no trade")
        return None
    
    return signal


# =============================================================================
# TESTING
# =============================================================================

if __name__ == "__main__":
    from prompts import EXAMPLE_MARKET_DATA
    
    print("=" * 60)
    print("RATIO BOT - LLM ENGINE TEST")
    print("=" * 60)
    
    # Check for API key
    if not OPENAI_API_KEY:
        print("\n⚠️  No OPENAI_API_KEY found in environment.")
        print("   Create a .env file with your API key to test.")
        print("   See env_template.txt for format.")
        print("\nSkipping API test, showing example output format...")
        
        # Show example signal format
        example_signal = {
            "trade_type": "BASKET",
            "basket_category": "METALS_VS_CRYPTO",
            "long_basket": [
                {"coin": "XAU", "weight": 0.50},
                {"coin": "XAG", "weight": 0.30},
                {"coin": "XPT", "weight": 0.20}
            ],
            "short_basket": [
                {"coin": "BTC", "weight": 0.40},
                {"coin": "ETH", "weight": 0.35},
                {"coin": "SOL", "weight": 0.25}
            ],
            "confidence": 7.5,
            "thesis": "Risk-off sentiment with rising yields favors precious metals over crypto. Gold showing relative strength while BTC momentum weakens.",
            "position_sizing": {
                "recommended_sl_percent": 8,
                "recommended_tp_percent": 20,
                "risk_reward_ratio": 2.5
            },
            "factor_analysis": {
                "momentum_divergence": 8,
                "sector_rotation_signal": 7,
                "macro_alignment": 8,
                "volatility_match": 6,
                "correlation_quality": 7,
                "funding_favorability": 8,
                "overall_confluence": 7
            },
            "execution_recommendation": "TWAP",
            "weighting_method": "volatility"
        }
        
        # Create engine without API call
        print("\n--- Example Signal Validation ---")
        engine = LLMEngine.__new__(LLMEngine)
        engine.model = LLM_MODEL
        
        # Manually set attributes needed for validation
        is_valid, errors = LLMEngine.validate_signal(engine, example_signal)
        print(f"Valid: {is_valid}")
        if errors:
            print(f"Errors: {errors}")
        
        print("\n--- Example Signal Summary ---")
        print(LLMEngine.format_signal_summary(engine, example_signal))
        
    else:
        print("\n✓ API key found, running live test...")
        
        try:
            engine = LLMEngine()
            
            print("\n--- Generating Signal from Example Market Data ---")
            signal = engine.generate_signal(EXAMPLE_MARKET_DATA)
            
            print("\n--- Validating Signal ---")
            is_valid, errors = engine.validate_signal(signal)
            print(f"Valid: {is_valid}")
            if errors:
                print(f"Errors: {errors}")
            
            print("\n--- Signal Summary ---")
            print(engine.format_signal_summary(signal))
            
            print("\n--- Should Trade? ---")
            should = engine.should_trade(signal)
            print(f"Should trade: {should}")
            
            print("\n--- Raw Signal JSON ---")
            print(json.dumps(signal, indent=2))
            
        except Exception as e:
            print(f"\n❌ Error during test: {e}")
            raise

