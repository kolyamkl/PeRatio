"""
RATIO Bot LLM Prompts
=====================
All prompt templates for GPT-4o-mini signal generation.
"""

# =============================================================================
# SYSTEM PROMPT - Defines the AI's role and expertise
# =============================================================================

SYSTEM_PROMPT = """You are a professional cryptocurrency pair trader specializing in simple pair trades.
You trade on Hyperliquid DEX with $10 USDC per trade.

**AVAILABLE ASSETS (7 ONLY - STRICTLY ENFORCED):**
BTC, ETH, SOL, ARB, OP, DOGE, MATIC

⚠️ CRITICAL: You can ONLY use the 7 assets above. 
DO NOT suggest any other assets - they will cause execution errors.

## SIMPLE PAIR TRADING

You create SIMPLE PAIR trades with exactly ONE asset long and ONE asset short.
- Pick 1 asset to go LONG
- Pick 1 different asset to go SHORT
- Each asset gets weight of 1.0 (100%)

## TRADE STRATEGIES

1. **L1 vs L2:** Long BTC or ETH or SOL / Short ARB or OP or MATIC
2. **Blue Chip vs Meme:** Long BTC or ETH / Short DOGE
3. **Momentum:** Long strongest performer / Short weakest performer
4. **Mean Reversion:** Long most oversold / Short most overbought

## DYNAMIC RISK PARAMETERS (YOU DECIDE)

- **Stop Loss:** Choose 3-15% based on volatility and conviction
- **Take Profit:** Choose 5-30% based on opportunity size
- **Risk/Reward:** Aim for at least 1.5:1 ratio
- **Trade Size:** $10 USDC per side (fixed)

## OUTPUT REQUIREMENTS

You must output ONLY valid JSON matching the exact schema provided.
- long_basket: exactly 1 asset with weight 1.0
- short_basket: exactly 1 asset with weight 1.0  
- recommended_sl_percent: 3-15% (based on volatility)
- recommended_tp_percent: 5-30% (based on opportunity)
- No additional text, explanations, or markdown - just the JSON object.

## CREATIVITY REQUIREMENT

Each signal request is UNIQUE. Generate a DIFFERENT pair trade each time.
Vary your selections based on the current market data provided."""


# =============================================================================
# SIGNAL GENERATION PROMPT - Template for market analysis
# =============================================================================

SIGNAL_PROMPT_TEMPLATE = """MARKET DATA AS OF {timestamp}:

=== CRYPTO PRICES (USD) ===
BTC: ${btc_price:,.0f}  ETH: ${eth_price:,.0f}  SOL: ${sol_price:.2f}
ARB: ${arb_price:.3f}  OP: ${op_price:.3f}  DOGE: ${doge_price:.4f}  MATIC: ${matic_price:.3f}

=== 4-HOUR MOMENTUM (% change) ===
BTC: {btc_mom:+.2f}%  ETH: {eth_mom:+.2f}%  SOL: {sol_mom:+.2f}%
ARB: {arb_mom:+.2f}%  OP: {op_mom:+.2f}%  DOGE: {doge_mom:+.2f}%  MATIC: {matic_mom:+.2f}%

=== 7-DAY VOLATILITY (%) ===
BTC: {btc_vol:.1f}%  ETH: {eth_vol:.1f}%  SOL: {sol_vol:.1f}%
ARB: {arb_vol:.1f}%  OP: {op_vol:.1f}%  DOGE: {doge_vol:.1f}%  MATIC: {matic_vol:.1f}%

=== SENTIMENT SCORES (-1 bearish to +1 bullish) ===
BTC: {btc_sent:+.2f}  ETH: {eth_sent:+.2f}  SOL: {sol_sent:+.2f}

=== FUNDING RATES (8h, positive = longs pay shorts) ===
BTC: {btc_fund:+.5f}%  ETH: {eth_fund:+.5f}%  SOL: {sol_fund:+.5f}%

=== CRYPTO CORRELATIONS (7-day rolling) ===
BTC/ETH: {corr_btc_eth:.2f}  BTC/SOL: {corr_btc_sol:.2f}  ETH/SOL: {corr_eth_sol:.2f}
ARB/OP: {corr_arb_op:.2f}  ARB/MATIC: {corr_arb_matic:.2f}

=== MACRO INDICATORS ===
DXY (Dollar Index): {dxy:.2f}
US 10Y Yield: {us10y:.2f}%
VIX (Fear Index): {vix:.2f}
BTC Dominance: {btc_dom:.1f}%
ETH Dominance: {eth_dom:.1f}%

---

## ANALYSIS TASK

1. Analyze all 7 crypto assets: BTC, ETH, SOL, ARB, OP, DOGE, MATIC
2. Identify the BEST basket pair trade opportunity (1-5 assets per side)
3. Consider:
   - Momentum divergence between assets
   - Layer 1 vs Layer 2 rotation
   - Volatility matching between baskets
   - Correlation structure for mean reversion
   - Funding rate costs

4. Assign confidence score 0-10:
   - 0-4: No trade (weak or conflicting signals)
   - 5-6: Moderate opportunity (2-3 factors aligned)
   - 7-8: Strong opportunity (4-5 factors aligned)
   - 9-10: Exceptional (all factors aligned, rare)

## OUTPUT JSON FORMAT (STRICT - SIMPLE PAIR TRADE)

{{
  "trade_type": "PAIR",
  "basket_category": "L1_VS_L2" | "BLUECHIP_VS_MEME" | "MOMENTUM" | "MEAN_REVERSION",
  "long_basket": [
    {{"coin": "<SYMBOL>", "weight": 1.0}}
  ],
  "short_basket": [
    {{"coin": "<SYMBOL>", "weight": 1.0}}
  ],
  "pair_ratio": {{
    "entry_ratio": <number>,
    "target_ratio": <number>,
    "stop_ratio": <number>,
    "ratio_explanation": "<one line: LONG_SYMBOL / SHORT_SYMBOL>"
  }},
  "confidence": <0-10>,
  "thesis": "<1-2 sentence explanation of trade rationale>",
  "position_sizing": {{
    "recommended_sl_percent": <3-15, based on volatility>,
    "recommended_tp_percent": <5-30, based on opportunity>,
    "risk_reward_ratio": <TP/SL ratio, aim for 1.5+ >
  }},
  "factor_analysis": {{
    "momentum_divergence": <1-10>,
    "layer_rotation_signal": <1-10>,
    "volatility_match": <1-10>,
    "correlation_quality": <1-10>,
    "funding_favorability": <1-10>,
    "overall_confluence": <1-10>
  }},
  "execution_recommendation": "MARKET",
  "weighting_method": "equal"
}}

IMPORTANT:
- ONLY use these 7 symbols: BTC, ETH, SOL, ARB, OP, DOGE, MATIC
- EXACTLY 1 asset per basket (simple pair trade)
- Weight MUST be 1.0 for each asset
- Choose SL (3-15%) and TP (5-30%) based on market conditions
- Output ONLY the JSON, no other text"""


# =============================================================================
# VALIDATION PROMPT - For double-checking signals
# =============================================================================

VALIDATION_PROMPT = """Review this trading signal for errors:

{signal_json}

Check:
1. Are all symbols valid? ONLY these 7: (BTC, ETH, SOL, ARB, OP, DOGE, MATIC)
2. Is there exactly 1 asset per basket?
3. Is confidence between 0-10?
4. Is SL exactly 10%?
5. Is TP exactly 20%?
6. Is pair_ratio included with entry_ratio, target_ratio, stop_ratio?

INVALID ASSETS (cause 500 errors): LINK, XRP, PAXG, AVAX, XAU, XAG, any stocks

Output JSON: {{"valid": true/false, "errors": ["error1", "error2", ...]}}"""


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def format_signal_prompt(market_data: dict) -> str:
    """
    Format the signal prompt with actual market data.
    
    Args:
        market_data: Dictionary containing all market data
        
    Returns:
        Formatted prompt string ready for LLM
    """
    from datetime import datetime
    import random
    
    # Add small random variations to momentum values to encourage different signals
    momentum_noise = lambda x: x + random.uniform(-0.5, 0.5) if x else random.uniform(-1.0, 1.0)
    
    # Default values for crypto-only data
    defaults = {
        # Prices (7 crypto assets)
        "btc_price": 0, "eth_price": 0, "sol_price": 0,
        "arb_price": 0, "op_price": 0, "doge_price": 0, "matic_price": 0,
        
        # Momentum (4h)
        "btc_mom": 0, "eth_mom": 0, "sol_mom": 0,
        "arb_mom": 0, "op_mom": 0, "doge_mom": 0, "matic_mom": 0,
        
        # Volatility (7d)
        "btc_vol": 0, "eth_vol": 0, "sol_vol": 0,
        "arb_vol": 0, "op_vol": 0, "doge_vol": 0, "matic_vol": 0,
        
        # Sentiment
        "btc_sent": 0, "eth_sent": 0, "sol_sent": 0,
        
        # Funding
        "btc_fund": 0, "eth_fund": 0, "sol_fund": 0,
        
        # Correlations
        "corr_btc_eth": 0, "corr_btc_sol": 0, "corr_eth_sol": 0,
        "corr_arb_op": 0, "corr_arb_matic": 0,
        
        # Macro
        "dxy": 100, "us10y": 4.0, "vix": 20,
        "btc_dom": 50, "eth_dom": 18,
        
        # Timestamp - unique per request
        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S.%f UTC"),
    }
    
    # Merge provided data with defaults
    data = {**defaults, **market_data}
    
    # Add random variations to momentum to encourage different signals each time
    for key in ["btc_mom", "eth_mom", "sol_mom", "arb_mom", "op_mom", "doge_mom", "matic_mom"]:
        data[key] = momentum_noise(data.get(key, 0))
    
    # Format the prompt
    try:
        return SIGNAL_PROMPT_TEMPLATE.format(**data)
    except KeyError as e:
        raise ValueError(f"Missing required market data field: {e}")


def get_system_prompt() -> str:
    """Get the system prompt for the LLM."""
    return SYSTEM_PROMPT


# =============================================================================
# EXAMPLE MARKET DATA (for testing) - CRYPTO ONLY
# =============================================================================

EXAMPLE_MARKET_DATA = {
    "timestamp": "2026-01-17 08:00:00 UTC",
    
    # Crypto prices (7 assets)
    "btc_price": 95000, "eth_price": 3200, "sol_price": 185.50,
    "arb_price": 0.22, "op_price": 1.85, "doge_price": 0.14, "matic_price": 0.45,
    
    # Momentum (4h)
    "btc_mom": 2.1, "eth_mom": -0.8, "sol_mom": 1.5,
    "arb_mom": -1.2, "op_mom": -0.5, "doge_mom": 3.2, "matic_mom": -0.3,
    
    # Volatility (7d)
    "btc_vol": 3.2, "eth_vol": 4.1, "sol_vol": 6.8,
    "arb_vol": 8.1, "op_vol": 7.8, "doge_vol": 12.5, "matic_vol": 7.2,
    
    # Sentiment
    "btc_sent": 0.65, "eth_sent": 0.45, "sol_sent": 0.55,
    
    # Funding
    "btc_fund": 0.012, "eth_fund": 0.008, "sol_fund": 0.015,
    
    # Correlations
    "corr_btc_eth": 0.88, "corr_btc_sol": 0.72, "corr_eth_sol": 0.68,
    "corr_arb_op": 0.85, "corr_arb_matic": 0.78,
    
    # Macro
    "dxy": 104.5, "us10y": 4.25, "vix": 18.5,
    "btc_dom": 52.5, "eth_dom": 17.8,
}


if __name__ == "__main__":
    # Test prompt generation
    print("=" * 60)
    print("SYSTEM PROMPT")
    print("=" * 60)
    print(SYSTEM_PROMPT[:500] + "...")
    print()
    print("=" * 60)
    print("FORMATTED SIGNAL PROMPT (with example data)")
    print("=" * 60)
    formatted = format_signal_prompt(EXAMPLE_MARKET_DATA)
    print(formatted[:1500] + "...")

