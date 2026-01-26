import asyncio
import os
import random
import re
import json
import time
import logging
import sys
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

import httpx
import requests
from openai import OpenAI
from fastapi import Depends, FastAPI, HTTPException, Path, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.constants import ParseMode
from telegram.ext import Application, CommandHandler, ContextTypes

from config import get_settings

# Add lllm path for SignalGenerator import
_lllm_path = os.path.join(os.path.dirname(__file__), "lllm")
if _lllm_path not in sys.path:
    sys.path.insert(0, _lllm_path)
    
try:
    from signal_generator import SignalGenerator
    LLLM_AVAILABLE = True
    logger_temp = logging.getLogger(__name__)
    logger_temp.info(f"[LLLM] ✅ SignalGenerator imported from {_lllm_path}")
except ImportError as e:
    LLLM_AVAILABLE = False
    logger_temp = logging.getLogger(__name__)
    logger_temp.warning(f"[LLLM] ⚠️ SignalGenerator not available: {e}")
from database import engine, get_session, init_db
from models import NotificationSetting, Trade
from pear_api import fetch_open_positions, parse_positions_for_notification
from analytics import get_trade_statistics, get_performance_data
from schemas import (
    ExecuteTradeRequest,
    GenerateTradeRequest,
    GenerateTradeResponse,
    NotificationSettingSchema,
    ParseTradeMessageRequest,
    SaveNotificationSettingRequest,
    TradeSchema,
    default_expiry,
    new_trade_id,
)

# Configure logging - both console and file
log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
date_format = '%Y-%m-%d %H:%M:%S'

# Create logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(logging.Formatter(log_format, date_format))
logger.addHandler(console_handler)

# File handler - logs persist to /tmp/tgtrade_backend.log
file_handler = logging.FileHandler('/tmp/tgtrade_backend.log')
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(logging.Formatter(log_format, date_format))
logger.addHandler(file_handler)

# Also configure root logger for other modules
logging.basicConfig(
    level=logging.INFO,
    format=log_format,
    datefmt=date_format,
    handlers=[console_handler, file_handler]
)

settings = get_settings()
app = FastAPI(title="PeRatio Mini App Backend", version="0.1.0")
telegram_app: Optional[Application] = None
BACKEND_BASE = settings.backend_url or os.environ.get("BACKEND_URL", "")
MINI_APP_URL = settings.mini_app_url or os.environ.get("MINI_APP_URL", "https://example.com")

logger.info("=" * 60)
logger.info("🚀 TG_TRADE BACKEND STARTING")
logger.info("=" * 60)
logger.info(f"BOT_TOKEN: {'✅ SET' if settings.bot_token else '❌ MISSING'}")
logger.info(f"BACKEND_URL: {BACKEND_BASE}")
logger.info(f"MINI_APP_URL: {MINI_APP_URL}")
logger.info(f"OPENAI_API_KEY: {'✅ SET' if settings.openai_api_key else '❌ MISSING'}")
logger.info(f"PEAR_ACCESS_TOKEN: {'✅ SET' if settings.pear_access_token else '❌ MISSING'}")
logger.info(f"PEAR_USER_WALLET: {settings.pear_user_wallet or '❌ MISSING'}")
logger.info(f"PEAR_AGENT_WALLET: {settings.pear_agent_wallet or '❌ MISSING'}")
logger.info("=" * 60)

# Rate limiting: cache LLM responses per user (disabled - fresh response every /start)
_llm_cache: Dict[str, tuple[float, Dict]] = {}
LLM_CACHE_TTL = 0  # seconds (0 = disabled, every /start generates fresh LLM response)


def format_trade_message(trade: Dict[str, Any]) -> tuple[str, InlineKeyboardMarkup]:
    tp = trade.get("takeProfitRatio", 0) * 100
    sl = trade.get("stopLossRatio", 0) * 100
    pair = trade.get("pair", {})
    long_leg = pair.get("long", {})
    short_leg = pair.get("short", {})
    
    # Get basket data if available
    long_basket = trade.get("longBasket", [])
    short_basket = trade.get("shortBasket", [])
    basket_category = trade.get("basketCategory", "")
    confidence = trade.get("confidence", 0)
    
    # Format basket strings
    if long_basket and len(long_basket) > 0:
        long_assets = " + ".join([f"{a['coin']} ({a['weight']*100:.0f}%)" for a in long_basket])
        long_notional = sum(a.get('notional', 0) for a in long_basket)
    else:
        long_assets = long_leg.get('symbol', '').replace('-PERP', '')
        long_notional = long_leg.get('notional', 0)
    
    if short_basket and len(short_basket) > 0:
        short_assets = " + ".join([f"{a['coin']} ({a['weight']*100:.0f}%)" for a in short_basket])
        short_notional = sum(a.get('notional', 0) for a in short_basket)
    else:
        short_assets = short_leg.get('symbol', '').replace('-PERP', '')
        short_notional = short_leg.get('notional', 0)
    
    # Build message with basket info
    category_emoji = {
        "MOMENTUM": "🚀",
        "MEAN_REVERSION": "🔄",
        "LAYER1_VS_LAYER2": "⚡",
        "BLUECHIP_VS_ALTS": "💎",
    }.get(basket_category, "📊")
    
    message = (
        "🤖 *AI Basket Pair Trade*\n\n"
    )
    
    # Add category and confidence if available
    if basket_category:
        message += f"{category_emoji} *Strategy:* {basket_category.replace('_', ' ')}\n"
    if confidence:
        confidence_bar = "🟢" * int(confidence/2) + "⚪" * (5 - int(confidence/2))
        message += f"📈 *Confidence:* {confidence}/10 {confidence_bar}\n\n"
    else:
        message += "\n"
    
    message += (
        "📗 *LONG Basket:*\n"
        f"  {long_assets}\n"
        f"  💵 ${long_notional:.0f} | {long_leg.get('leverage', 2)}x leverage\n\n"
        "📕 *SHORT Basket:*\n"
        f"  {short_assets}\n"
        f"  💵 ${short_notional:.0f} | {short_leg.get('leverage', 2)}x leverage\n\n"
        f"🎯 Take Profit: *+{tp:.1f}%*\n"
        f"🛡 Stop Loss: *{sl:.1f}%*\n\n"
        f"💡 *Thesis:*\n_{trade.get('reasoning')}_\n\n"
        "Tap below to review and confirm ⬇️"
    )

    # Build URL with ALL trade parameters to avoid API caching issues
    import urllib.parse
    params = {
        "tradeId": trade.get('tradeId'),
        "tp": tp,
        "sl": abs(sl),
        "leverage": long_leg.get('leverage', 2),
        "confidence": trade.get('confidence', 0),
        "category": trade.get('basketCategory', ''),
        "longBasket": urllib.parse.quote(str([{
            "coin": a['coin'],
            "weight": a['weight'],
            "notional": a.get('notional', 0)
        } for a in long_basket])),
        "shortBasket": urllib.parse.quote(str([{
            "coin": a['coin'],
            "weight": a['weight'],
            "notional": a.get('notional', 0)
        } for a in short_basket])),
        "t": int(time.time())
    }
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    mini_app_url = f"{MINI_APP_URL}?{query_string}"
    
    keyboard = InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton(
                    text="📱 Review & Confirm Trade",
                    web_app={"url": mini_app_url},
                )
            ]
        ]
    )
    return message, keyboard


async def handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command - generate LLM trade signal and send to user"""
    if not settings.bot_token:
        logger.warning("[/start] No bot token configured")
        return

    user = update.effective_user
    chat_id = update.effective_chat.id if update.effective_chat else None
    if not chat_id:
        logger.warning("[/start] No chat_id found")
        return

    logger.info(f"[/start] User {user.id} (@{user.username}) requested trade signal")

    try:
        logger.info(f"[/start] Calling LLM endpoint for user {user.id}")
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "http://localhost:8000/api/llm/generate-trade",
                json={"userId": str(user.id)},
            )
            resp.raise_for_status()
            trade = resp.json()
        
        logger.info(f"[/start] Trade generated: {trade.get('tradeId')} - {trade.get('pair', {}).get('long', {}).get('symbol')} vs {trade.get('pair', {}).get('short', {}).get('symbol')}")
    except httpx.TimeoutException:
        logger.error(f"[/start] Timeout calling LLM endpoint for user {user.id}")
        await context.bot.send_message(chat_id, "❌ Request timed out. Please try again.")
        return
    except Exception as e:
        logger.error(f"[/start] Error generating trade for user {user.id}: {e}")
        await context.bot.send_message(chat_id, "❌ Error generating trade. Please try again.")
        return

    message, keyboard = format_trade_message(trade)
    logger.info(f"[/start] Sending trade message to chat {chat_id}")
    await context.bot.send_message(
        chat_id,
        message,
        reply_markup=keyboard,
        parse_mode=ParseMode.MARKDOWN,
    )
    logger.info(f"[/start] ✅ Trade signal sent to user {user.id}")


@app.on_event("startup")
async def on_startup() -> None:
    """Initialize database, Telegram bot, and background workers"""
    logger.info("[STARTUP] Initializing database...")
    init_db()
    logger.info("[STARTUP] ✅ Database initialized")
    
    global telegram_app
    
    bot_token = settings.bot_token
    
    if bot_token:
        try:
            logger.info("[STARTUP] Initializing Telegram bot...")
            telegram_app = Application.builder().token(bot_token).build()
            telegram_app.add_handler(CommandHandler("start", handle_start))
            await telegram_app.initialize()
            await telegram_app.start()
            
            bot_info = await telegram_app.bot.get_me()
            logger.info(f"[STARTUP] ✅ Bot initialized: @{bot_info.username}")

            if BACKEND_BASE:
                webhook_url = f"{BACKEND_BASE.rstrip('/')}/bot/webhook"
                try:
                    logger.info(f"[STARTUP] Setting webhook to: {webhook_url}")
                    await telegram_app.bot.delete_webhook(drop_pending_updates=True)
                    result = await telegram_app.bot.set_webhook(webhook_url)
                    if result:
                        logger.info(f"[STARTUP] ✅ Webhook set successfully")
                        webhook_info = await telegram_app.bot.get_webhook_info()
                        logger.info(f"[STARTUP] Webhook URL: {webhook_info.url}")
                        logger.info(f"[STARTUP] Pending updates: {webhook_info.pending_update_count}")
                    else:
                        logger.error(f"[STARTUP] ❌ Webhook set returned False")
                except Exception as exc:
                    logger.error(f"[STARTUP] ❌ Failed to set webhook: {exc}")
            else:
                logger.warning("[STARTUP] ⚠️ BACKEND_URL not set, webhook not configured")
        except Exception as exc:
            logger.error(f"[STARTUP] ❌ Failed to initialize bot: {exc}")
            telegram_app = None
    else:
        logger.warning("[STARTUP] ⚠️ No bot token, Telegram bot not initialized")

    try:
        logger.info("[STARTUP] Starting notification worker...")
        app.state.notification_task = asyncio.create_task(notification_worker())
        logger.info("[STARTUP] ✅ Notification worker started")
    except Exception as exc:
        logger.error(f"[STARTUP] ❌ Failed to start scheduler: {exc}")
    
    logger.info("[STARTUP] ========== BACKEND READY ==========")


cors_list = settings.get_cors_list()
logger.info(f"[CORS] Allowed origins: {cors_list}")
if cors_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def trade_to_response(trade: Trade) -> TradeSchema:
    # Parse basket data from JSON fields
    long_basket = None
    short_basket = None
    factor_analysis = None
    
    if hasattr(trade, 'long_basket_json') and trade.long_basket_json:
        try:
            long_basket = json.loads(trade.long_basket_json)
        except:
            long_basket = None
    
    if hasattr(trade, 'short_basket_json') and trade.short_basket_json:
        try:
            short_basket = json.loads(trade.short_basket_json)
        except:
            short_basket = None
    
    if hasattr(trade, 'factor_analysis_json') and trade.factor_analysis_json:
        try:
            factor_analysis = json.loads(trade.factor_analysis_json)
        except:
            factor_analysis = None
    
    return TradeSchema(
        tradeId=trade.trade_id,
        pair={
            "long": {
                "symbol": trade.pair_long_symbol,
                "notional": trade.pair_long_notional,
                "leverage": trade.pair_long_leverage,
            },
            "short": {
                "symbol": trade.pair_short_symbol,
                "notional": trade.pair_short_notional,
                "leverage": trade.pair_short_leverage,
            },
        },
        takeProfitRatio=trade.take_profit_ratio,
        stopLossRatio=trade.stop_loss_ratio,
        reasoning=trade.reasoning,
        status=trade.status,
        expiresAt=trade.expires_at,
        # Multi-basket fields
        longBasket=long_basket,
        shortBasket=short_basket,
        basketCategory=getattr(trade, 'basket_category', None),
        confidence=getattr(trade, 'confidence', None),
        factorAnalysis=factor_analysis,
    )


def parse_trade_message_text(message: str) -> Optional[Dict[str, Any]]:
    long_match = re.search(
        r"LONG:\s*([A-Za-z0-9\\-]+)\\s*\\|\\s*\\$?([0-9.+-]+)\\s*\\|\\s*([0-9]+)x",
        message,
        re.IGNORECASE,
    )
    short_match = re.search(
        r"SHORT:\\s*([A-Za-z0-9\\-]+)\\s*\\|\\s*\\$?([0-9.+-]+)\\s*\\|\\s*([0-9]+)x",
        message,
        re.IGNORECASE,
    )
    tp_match = re.search(r"Take Profit:\\s*\\+?(-?[0-9]+(?:\\.[0-9]+)?)%", message, re.IGNORECASE)
    sl_match = re.search(r"Stop Loss:\\s*([+-]?[0-9]+(?:\\.[0-9]+)?)%", message, re.IGNORECASE)

    if not (long_match and short_match and tp_match and sl_match):
        return None

    def parse_leg(match_obj: re.Match) -> Dict[str, Any]:
        return {
            "symbol": match_obj.group(1),
            "notional": float(match_obj.group(2)),
            "leverage": int(match_obj.group(3)),
        }

    reasoning = ""
    if "Reasoning:" in message:
        reasoning = message.split("Reasoning:", 1)[-1].strip()

    return {
        "long": parse_leg(long_match),
        "short": parse_leg(short_match),
        "take_profit_pct": float(tp_match.group(1)),
        "stop_loss_pct": float(sl_match.group(1)),
        "reasoning": reasoning,
    }


def notification_setting_to_schema(setting: NotificationSetting) -> NotificationSettingSchema:
    return NotificationSettingSchema(
        userId=setting.user_id,
        chatId=setting.chat_id,
        frequency=setting.frequency,
        time=setting.time_of_day,
        timezone=setting.timezone,
        lastSentAt=setting.last_sent_at,
    )


@app.post("/api/llm/generate-trade", response_model=GenerateTradeResponse)
def generate_trade(
    payload: GenerateTradeRequest, session: Session = Depends(get_session)
) -> Any:
    """Generate a multi-basket trade signal using LLLM SignalGenerator"""
    trade_id = new_trade_id()
    user_id = payload.userId
    
    logger.info(f"")
    logger.info(f"{'='*60}")
    logger.info(f"[LLM] 📊 NEW TRADE REQUEST")
    logger.info(f"{'='*60}")
    logger.info(f"[LLM] User ID: {user_id}")
    logger.info(f"[LLM] Trade ID: {trade_id}")
    logger.info(f"[LLM] LLLM Available: {LLLM_AVAILABLE}")
    
    # Check rate limit cache
    now = time.time()
    if user_id in _llm_cache:
        cached_time, cached_trade = _llm_cache[user_id]
        remaining = int(LLM_CACHE_TTL - (now - cached_time))
        if remaining > 0:
            logger.info(f"[LLM] ⏱️ Rate limit active - using cached signal")
            logger.info(f"[LLM] Wait {remaining}s for new signal")
            # Return cached but with new trade_id - save to DB
            trade = Trade(
                trade_id=trade_id,
                user_id=user_id,
                pair_long_symbol=cached_trade["pair"]["long"]["symbol"],
                pair_long_notional=cached_trade["pair"]["long"]["notional"],
                pair_long_leverage=cached_trade["pair"]["long"]["leverage"],
                pair_short_symbol=cached_trade["pair"]["short"]["symbol"],
                pair_short_notional=cached_trade["pair"]["short"]["notional"],
                pair_short_leverage=cached_trade["pair"]["short"]["leverage"],
                take_profit_ratio=cached_trade["takeProfitRatio"],
                stop_loss_ratio=cached_trade["stopLossRatio"],
                reasoning=cached_trade["reasoning"] + " (cached)",
                status="PENDING",
                expires_at=default_expiry(),
                # Multi-basket fields from cache
                long_basket_json=cached_trade.get("longBasketJson"),
                short_basket_json=cached_trade.get("shortBasketJson"),
                basket_category=cached_trade.get("basketCategory"),
                confidence=cached_trade.get("confidence"),
                factor_analysis_json=cached_trade.get("factorAnalysisJson"),
            )
            session.add(trade)
            session.commit()
            logger.info(f"[LLM] ✅ Cached trade saved: {trade_id}")
            return trade_to_response(trade)
    
    # Initialize signal data
    signal_data = None
    long_basket = []
    short_basket = []
    basket_category = None
    confidence = None
    factor_analysis = None
    
    # Try LLLM SignalGenerator first
    if LLLM_AVAILABLE:
        try:
            logger.info(f"")
            logger.info(f"[LLM] 🧠 LLLM SIGNAL GENERATOR")
            logger.info(f"[LLM] {'-'*40}")
            
            # Initialize SignalGenerator (use_mock=False forces real LLM)
            signal_gen = SignalGenerator(use_live_data=False, use_mock=False)
            logger.info(f"[LLM] SignalGenerator initialized (use_live_data=False, use_mock=False)")
            
            # Generate signal
            logger.info(f"[LLM] 🤖 Calling GPT-4o-mini via LLLM...")
            signal_data = signal_gen.generate_signal()
            
            # Log the full signal
            logger.info(f"")
            logger.info(f"[LLM] 📈 SIGNAL RECEIVED")
            logger.info(f"[LLM] {'-'*40}")
            logger.info(f"[LLM] Trade Type: {signal_data.get('trade_type', 'N/A')}")
            logger.info(f"[LLM] Basket Category: {signal_data.get('basket_category', 'N/A')}")
            logger.info(f"[LLM] Confidence: {signal_data.get('confidence', 0)}/10")
            logger.info(f"[LLM] Meets Threshold: {signal_data.get('meets_threshold', False)}")
            
            # Log baskets
            long_basket = signal_data.get("long_basket", [])
            short_basket = signal_data.get("short_basket", [])
            
            logger.info(f"")
            logger.info(f"[LLM] 📗 LONG BASKET ({len(long_basket)} assets):")
            for i, asset in enumerate(long_basket):
                logger.info(f"[LLM]   {i+1}. {asset.get('coin', '?')} - weight: {asset.get('weight', 0):.1%}")
            
            logger.info(f"")
            logger.info(f"[LLM] 📕 SHORT BASKET ({len(short_basket)} assets):")
            for i, asset in enumerate(short_basket):
                logger.info(f"[LLM]   {i+1}. {asset.get('coin', '?')} - weight: {asset.get('weight', 0):.1%}")
            
            # Log position sizing
            pos_sizing = signal_data.get("position_sizing", {})
            logger.info(f"")
            logger.info(f"[LLM] 💰 POSITION SIZING:")
            logger.info(f"[LLM]   Stop Loss: {pos_sizing.get('recommended_sl_percent', 5)}%")
            logger.info(f"[LLM]   Take Profit: {pos_sizing.get('recommended_tp_percent', 15)}%")
            logger.info(f"[LLM]   Risk/Reward: {pos_sizing.get('risk_reward_ratio', 0):.1f}")
            
            # Log factor analysis
            factor_analysis = signal_data.get("factor_analysis", {})
            if factor_analysis:
                logger.info(f"")
                logger.info(f"[LLM] 📊 FACTOR ANALYSIS:")
                for factor, score in factor_analysis.items():
                    logger.info(f"[LLM]   {factor}: {score}/10")
            
            # Log thesis
            thesis = signal_data.get("thesis", "")
            logger.info(f"")
            logger.info(f"[LLM] 📝 THESIS:")
            logger.info(f"[LLM]   {thesis[:200]}{'...' if len(thesis) > 200 else ''}")
            
            basket_category = signal_data.get("basket_category")
            confidence = signal_data.get("confidence")
            
        except Exception as e:
            logger.error(f"[LLM] ❌ LLLM SignalGenerator error: {e}")
            import traceback
            logger.error(f"[LLM] Traceback: {traceback.format_exc()}")
            signal_data = None
    else:
        logger.warning(f"[LLM] ⚠️ LLLM not available, using fallback OpenAI call")
    
    # Fallback to direct OpenAI if LLLM failed
    if signal_data is None and settings.openai_api_key:
        logger.info(f"[LLM] 🔄 Fallback: Direct OpenAI call")
        try:
            client = OpenAI(api_key=settings.openai_api_key)
            
            signal_prompt = """You are a crypto basket pair trading signal generator for Hyperliquid DEX.

AVAILABLE ASSETS (ONLY THESE 7 WORK): BTC, ETH, SOL, ARB, OP, DOGE, MATIC

Generate a BASKET PAIR TRADE signal in this exact JSON format:
{
    "trade_type": "BASKET",
    "basket_category": "LAYER1_VS_LAYER2",
    "long_basket": [{"coin": "BTC", "weight": 0.5}, {"coin": "ETH", "weight": 0.5}],
    "short_basket": [{"coin": "ARB", "weight": 0.5}, {"coin": "OP", "weight": 0.5}],
    "confidence": 7,
    "thesis": "Brief explanation of the trade thesis",
    "position_sizing": {
        "recommended_sl_percent": 5,
        "recommended_tp_percent": 15
    }
}

Return ONLY valid JSON."""

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a professional crypto basket trader."},
                    {"role": "user", "content": signal_prompt}
                ],
                temperature=0.7,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            signal_text = response.choices[0].message.content.strip()
            signal_data = json.loads(signal_text)
            long_basket = signal_data.get("long_basket", [])
            short_basket = signal_data.get("short_basket", [])
            basket_category = signal_data.get("basket_category")
            confidence = signal_data.get("confidence")
            
            logger.info(f"[LLM] ✅ Fallback OpenAI response received")
            logger.info(f"[LLM] Long basket: {long_basket}")
            logger.info(f"[LLM] Short basket: {short_basket}")
            
        except Exception as e:
            logger.error(f"[LLM] ❌ Fallback OpenAI error: {e}")
            signal_data = None
    
    # If all LLM attempts failed, raise error - NO MOCK DATA
    if signal_data is None or not long_basket or not short_basket:
        logger.error(f"[LLM] ❌ All LLM generation attempts failed")
        logger.error(f"[LLM] signal_data: {signal_data}")
        logger.error(f"[LLM] long_basket: {long_basket}")
        logger.error(f"[LLM] short_basket: {short_basket}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM trade generation failed. Please check OpenAI API key configuration."
        )
    
    # Calculate notionals for baskets
    # Simple $10 per side for testing
    BASE_NOTIONAL_PER_SIDE = 10.0
    
    # Add notional to each basket asset based on weight
    for asset in long_basket:
        asset["notional"] = round(BASE_NOTIONAL_PER_SIDE * asset.get("weight", 1.0), 2)
    for asset in short_basket:
        asset["notional"] = round(BASE_NOTIONAL_PER_SIDE * asset.get("weight", 1.0), 2)
    
    logger.info(f"")
    logger.info(f"[LLM] 💵 NOTIONAL ALLOCATION:")
    logger.info(f"[LLM]   Base per side: ${BASE_NOTIONAL_PER_SIDE}")
    for asset in long_basket:
        logger.info(f"[LLM]   LONG {asset['coin']}: ${asset['notional']}")
    for asset in short_basket:
        logger.info(f"[LLM]   SHORT {asset['coin']}: ${asset['notional']}")
    
    # Use LLM's recommended TP/SL values
    pos_sizing = signal_data.get("position_sizing", {})
    sl_pct = pos_sizing.get("recommended_sl_percent", 10.0)  # Default 10% if not provided
    tp_pct = pos_sizing.get("recommended_tp_percent", 20.0)  # Default 20% if not provided
    
    # Clamp to valid range (3-15% SL, 5-30% TP)
    sl_pct = max(3.0, min(15.0, float(sl_pct)))
    tp_pct = max(5.0, min(30.0, float(tp_pct)))
    
    logger.info(f"[LLM] 📊 LLM recommended: TP={tp_pct}%, SL={sl_pct}%")
    
    # Use primary asset from each basket for the main pair
    # (For compatibility with existing Trade model)
    primary_long = long_basket[0]
    primary_short = short_basket[0]
    
    long_symbol = f"{primary_long['coin']}-PERP"
    short_symbol = f"{primary_short['coin']}-PERP"
    long_notional = sum(a["notional"] for a in long_basket)
    short_notional = sum(a["notional"] for a in short_basket)
    leverage = 2  # Conservative leverage for stability
    take_profit_ratio = tp_pct / 100
    stop_loss_ratio = -sl_pct / 100
    reasoning = signal_data.get("thesis", "AI-generated basket pair trade")
    
    logger.info(f"")
    logger.info(f"[LLM] 📋 TRADE SUMMARY")
    logger.info(f"[LLM] {'-'*40}")
    logger.info(f"[LLM] Primary Long: {long_symbol}")
    logger.info(f"[LLM] Primary Short: {short_symbol}")
    logger.info(f"[LLM] Total Long Notional: ${long_notional}")
    logger.info(f"[LLM] Total Short Notional: ${short_notional}")
    logger.info(f"[LLM] Leverage: {leverage}x")
    logger.info(f"[LLM] Take Profit: {take_profit_ratio*100:.1f}%")
    logger.info(f"[LLM] Stop Loss: {stop_loss_ratio*100:.1f}%")
    
    # Save trade to DB with full basket data
    trade = Trade(
        trade_id=trade_id,
        user_id=user_id,
        pair_long_symbol=long_symbol,
        pair_long_notional=long_notional,
        pair_long_leverage=leverage,
        pair_short_symbol=short_symbol,
        pair_short_notional=short_notional,
        pair_short_leverage=leverage,
        take_profit_ratio=take_profit_ratio,
        stop_loss_ratio=stop_loss_ratio,
        reasoning=reasoning,
        status="PENDING",
        expires_at=default_expiry(),
        # Multi-basket fields
        long_basket_json=json.dumps(long_basket),
        short_basket_json=json.dumps(short_basket),
        basket_category=basket_category,
        confidence=confidence,
        factor_analysis_json=json.dumps(factor_analysis) if factor_analysis else None,
    )
    session.add(trade)
    session.commit()
    
    logger.info(f"")
    logger.info(f"[LLM] 💾 TRADE SAVED")
    logger.info(f"[LLM] Trade ID: {trade_id}")
    logger.info(f"[LLM] Status: PENDING")
    
    # Cache the response
    result = trade_to_response(trade)
    _llm_cache[user_id] = (now, {
        "pair": {
            "long": {"symbol": long_symbol, "notional": long_notional, "leverage": leverage},
            "short": {"symbol": short_symbol, "notional": short_notional, "leverage": leverage},
        },
        "takeProfitRatio": take_profit_ratio,
        "stopLossRatio": stop_loss_ratio,
        "reasoning": reasoning,
        "longBasketJson": json.dumps(long_basket),
        "shortBasketJson": json.dumps(short_basket),
        "basketCategory": basket_category,
        "confidence": confidence,
        "factorAnalysisJson": json.dumps(factor_analysis) if factor_analysis else None,
    })
    
    logger.info(f"")
    logger.info(f"[LLM] ✅ TRADE GENERATION COMPLETE")
    logger.info(f"{'='*60}")
    return result


@app.post("/api/trades/parse-message", response_model=TradeSchema)
def parse_trade_message(
    payload: ParseTradeMessageRequest, session: Session = Depends(get_session)
) -> Any:
    parsed = parse_trade_message_text(payload.message)
    if not parsed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to parse trade parameters from message",
        )

    trade_id = new_trade_id()
    trade = Trade(
        trade_id=trade_id,
        user_id=payload.userId,
        pair_long_symbol=parsed["long"]["symbol"],
        pair_long_notional=parsed["long"]["notional"],
        pair_long_leverage=parsed["long"]["leverage"],
        pair_short_symbol=parsed["short"]["symbol"],
        pair_short_notional=parsed["short"]["notional"],
        pair_short_leverage=parsed["short"]["leverage"],
        take_profit_ratio=parsed["take_profit_pct"] / 100,
        stop_loss_ratio=parsed["stop_loss_pct"] / 100,
        reasoning=payload.reasoning or parsed.get("reasoning") or "AI generated trade",
        status="PENDING",
        expires_at=default_expiry(),
    )
    session.add(trade)
    session.commit()

    return trade_to_response(trade)


@app.get("/api/trades", response_model=List[TradeSchema])
def get_all_trades(
    user_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    session: Session = Depends(get_session)
) -> Any:
    """Get all trades from database, optionally filtered by user_id or status"""
    logger.info(f"[API] 📋 Fetching trades - user_id={user_id}, status={status}, limit={limit}")
    
    query = select(Trade)
    
    if user_id:
        query = query.where(Trade.user_id == user_id)
    if status:
        query = query.where(Trade.status == status.upper())
    
    query = query.order_by(Trade.created_at.desc()).limit(limit)
    trades = session.exec(query).all()
    
    logger.info(f"[API] ✅ Found {len(trades)} trades")
    
    return [trade_to_response(trade) for trade in trades]


@app.get("/api/positions")
async def get_pear_positions() -> Any:
    """
    Fetch real open positions from Pear Protocol API.
    Returns positions with PnL data formatted for the frontend.
    """
    logger.info("[API] 📊 Fetching real positions from Pear Protocol...")
    
    # Fetch positions from Pear API
    raw_positions = await fetch_open_positions(
        api_url=settings.pear_api_url,
        access_token=settings.pear_access_token
    )
    
    if not raw_positions.get("success"):
        logger.warning(f"[API] ⚠️ Failed to fetch positions: {raw_positions.get('error')}")
        return {
            "success": False,
            "error": raw_positions.get("error", "Unknown error"),
            "positions": [],
            "total_pnl": 0.0,
            "total_pnl_pct": 0.0,
            "total_notional": 0.0
        }
    
    # Parse raw Pear API response directly
    # Format: [{positionId, longAssets: [{coin, entryPrice, leverage, ...}], shortAssets: [...], unrealizedPnl, positionValue, ...}]
    positions_list = raw_positions.get("positions", [])
    
    trades_format = []
    total_pnl = 0.0
    total_notional = 0.0
    
    for i, pos in enumerate(positions_list):
        # Extract long asset info (first asset in longAssets array)
        long_assets = pos.get("longAssets", [])
        long_coin = long_assets[0].get("coin", "UNKNOWN") if long_assets else "UNKNOWN"
        long_entry_price = long_assets[0].get("entryPrice", 0) if long_assets else 0
        long_leverage = long_assets[0].get("leverage", 1) if long_assets else 1
        long_value = long_assets[0].get("positionValue", 0) if long_assets else 0
        
        # Extract short asset info (first asset in shortAssets array)
        short_assets = pos.get("shortAssets", [])
        short_coin = short_assets[0].get("coin", "UNKNOWN") if short_assets else "UNKNOWN"
        short_entry_price = short_assets[0].get("entryPrice", 0) if short_assets else 0
        short_leverage = short_assets[0].get("leverage", 1) if short_assets else 1
        short_value = short_assets[0].get("positionValue", 0) if short_assets else 0
        
        # Overall position data
        pnl = pos.get("unrealizedPnl", 0)
        pnl_pct = pos.get("unrealizedPnlPercentage", 0) * 100  # Convert to percentage
        notional = pos.get("positionValue", long_value + short_value)
        
        # Take profit / Stop loss
        tp_obj = pos.get("takeProfit", {})
        sl_obj = pos.get("stopLoss", {})
        take_profit = tp_obj.get("value", 10) if isinstance(tp_obj, dict) else 10
        stop_loss = sl_obj.get("value", 5) if isinstance(sl_obj, dict) else 5
        
        total_pnl += pnl
        total_notional += notional
        
        trade_obj = {
            "trade_id": pos.get("positionId", f"pear_pos_{i}"),
            "pair_long_symbol": long_coin,
            "pair_short_symbol": short_coin,
            "pair_long_notional": long_value,
            "pair_short_notional": short_value,
            "pair_long_entry_price": long_entry_price,
            "pair_short_entry_price": short_entry_price,
            "pair_long_leverage": long_leverage,
            "pair_short_leverage": short_leverage,
            "take_profit_ratio": take_profit / 100,  # e.g., 0.20 for 20%
            "stop_loss_ratio": -stop_loss / 100,     # e.g., -0.10 for 10%
            "status": "OPEN",
            "pnl_usd": pnl,
            "pnl_pct": pnl_pct,
            "reasoning": f"Pair trade: Long {long_coin}, Short {short_coin}",
            "created_at": pos.get("createdAt", datetime.utcnow().isoformat()),
            "updated_at": pos.get("updatedAt", datetime.utcnow().isoformat()),
        }
        trades_format.append(trade_obj)
        
        logger.info(f"[API] Position {i+1}: Long {long_coin} / Short {short_coin}, PnL: ${pnl:.4f} ({pnl_pct:.2f}%)")
    
    total_pnl_pct = (total_pnl / total_notional * 100) if total_notional > 0 else 0
    
    logger.info(f"[API] ✅ Returning {len(trades_format)} positions from Pear Protocol (Total PnL: ${total_pnl:.4f})")
    
    return {
        "success": True,
        "positions": trades_format,
        "total_pnl": total_pnl,
        "total_pnl_pct": total_pnl_pct,
        "total_notional": total_notional,
        "count": len(trades_format)
    }


@app.get("/api/trades/{trade_id}", response_model=TradeSchema)
def get_trade(
    trade_id: str = Path(...), session: Session = Depends(get_session)
) -> Any:
    logger.info(f"[API] 🔍 Fetching trade: {trade_id}")
    trade = session.exec(select(Trade).where(Trade.trade_id == trade_id)).first()
    if not trade:
        logger.warning(f"[API] ❌ Trade not found: {trade_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trade not found")
    logger.info(f"[API] ✅ Found trade: {trade_id} - {trade.pair_long_symbol}/{trade.pair_short_symbol}")
    return trade_to_response(trade)


@app.get("/api/wallet/info")
def get_wallet_info() -> Dict[str, Any]:
    """Get the backend trading wallet info for display in frontend"""
    logger.info("[WALLET] 💰 Wallet info requested")
    
    wallet_address = settings.pear_user_wallet or ""
    agent_wallet = settings.pear_agent_wallet or ""
    has_credentials = bool(settings.pear_access_token and wallet_address)
    
    # Shorten address for display
    display_address = f"{wallet_address[:6]}...{wallet_address[-4:]}" if len(wallet_address) > 10 else wallet_address
    
    result = {
        "walletAddress": wallet_address,
        "displayAddress": display_address,
        "agentWallet": agent_wallet,
        "hasCredentials": has_credentials,
        "network": "Hyperliquid (via Pear Protocol)",
        "status": "connected" if has_credentials else "not_configured"
    }
    
    logger.info(f"[WALLET] ✅ Returning wallet info: {display_address} - status={result['status']}")
    return result


@app.post("/api/trades/{trade_id}/execute", response_model=TradeSchema)
def execute_trade(
    payload: ExecuteTradeRequest,
    trade_id: str = Path(...),
    session: Session = Depends(get_session),
) -> Any:
    """Execute a pending trade via Pear Protocol API"""
    logger.info(f"[EXECUTE] 🚀 Execute request for trade: {trade_id}")
    
    trade = session.exec(select(Trade).where(Trade.trade_id == trade_id)).first()
    if not trade:
        logger.warning(f"[EXECUTE] ❌ Trade not found: {trade_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trade not found")

    logger.info(f"[EXECUTE] Found trade: status={trade.status}, pair={trade.pair_long_symbol}/{trade.pair_short_symbol}")

    if trade.status != "PENDING":
        logger.warning(f"[EXECUTE] ❌ Trade already processed: {trade.status}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Trade already processed"
        )

    if trade.expires_at and trade.expires_at < datetime.utcnow():
        logger.warning(f"[EXECUTE] ❌ Trade expired at {trade.expires_at}")
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Trade expired")

    long_leg: Dict[str, Any] = payload.pair.get("long", {})
    short_leg: Dict[str, Any] = payload.pair.get("short", {})

    trade.pair_long_symbol = long_leg.get("symbol", trade.pair_long_symbol)
    trade.pair_long_notional = float(long_leg.get("notional", trade.pair_long_notional))
    trade.pair_long_leverage = int(long_leg.get("leverage", trade.pair_long_leverage))

    trade.pair_short_symbol = short_leg.get("symbol", trade.pair_short_symbol)
    trade.pair_short_notional = float(short_leg.get("notional", trade.pair_short_notional))
    trade.pair_short_leverage = int(short_leg.get("leverage", trade.pair_short_leverage))

    trade.take_profit_ratio = payload.takeProfitRatio
    trade.stop_loss_ratio = payload.stopLossRatio
    
    logger.info(f"[EXECUTE] Updated params: LONG {trade.pair_long_symbol} ${trade.pair_long_notional} {trade.pair_long_leverage}x | SHORT {trade.pair_short_symbol} ${trade.pair_short_notional} {trade.pair_short_leverage}x")
    logger.info(f"[EXECUTE] TP/SL from user: takeProfitRatio={payload.takeProfitRatio} ({payload.takeProfitRatio * 100 if payload.takeProfitRatio else 0}%), stopLossRatio={payload.stopLossRatio} ({abs(payload.stopLossRatio * 100) if payload.stopLossRatio else 0}%)")

    # Execute via Pear Protocol API
    if settings.pear_access_token and settings.pear_api_url:
        try:
            logger.info(f"[PEAR] 🍐 Executing trade via Pear Protocol...")
            logger.info(f"[PEAR] API URL: {settings.pear_api_url}")
            logger.info(f"[PEAR] User wallet: {settings.pear_user_wallet}")
            
            # Get baskets from request (sent from mini app) - these are the actual assets user sees
            request_long_basket = payload.longBasket if payload.longBasket else []
            request_short_basket = payload.shortBasket if payload.shortBasket else []
            
            logger.info(f"[PEAR] Long basket from request: {[{'coin': a.coin, 'weight': a.weight} for a in request_long_basket]}")
            logger.info(f"[PEAR] Short basket from request: {[{'coin': a.coin, 'weight': a.weight} for a in request_short_basket]}")
            
            # Use primary asset from each basket (single asset per side for reliability)
            # The Pear API works best with single assets per side
            long_asset = None
            short_asset = None
            
            # Get primary long asset (highest weight or first)
            if request_long_basket and len(request_long_basket) > 0:
                # Sort by weight descending and take first
                sorted_long = sorted(request_long_basket, key=lambda x: x.weight, reverse=True)
                long_asset = sorted_long[0].coin.replace('-PERP', '')
                logger.info(f"[PEAR]   📈 Long (primary): {long_asset}")
                for a in request_long_basket:
                    logger.info(f"[PEAR]     - {a.coin}: {a.weight * 100:.1f}%")
            
            if not long_asset:
                long_asset = trade.pair_long_symbol.replace("-PERP", "")
                logger.info(f"[PEAR]   📈 Long (fallback): {long_asset}")
            
            # Get primary short asset (highest weight or first)
            if request_short_basket and len(request_short_basket) > 0:
                sorted_short = sorted(request_short_basket, key=lambda x: x.weight, reverse=True)
                short_asset = sorted_short[0].coin.replace('-PERP', '')
                logger.info(f"[PEAR]   📉 Short (primary): {short_asset}")
                for a in request_short_basket:
                    logger.info(f"[PEAR]     - {a.coin}: {a.weight * 100:.1f}%")
            
            if not short_asset:
                short_asset = trade.pair_short_symbol.replace("-PERP", "")
                logger.info(f"[PEAR]   📉 Short (fallback): {short_asset}")
            
            # Use single asset per side (most reliable with Pear API)
            long_assets = [{"asset": long_asset, "weight": 1.0}]
            short_assets = [{"asset": short_asset, "weight": 1.0}]
            
            logger.info(f"[PEAR] 📊 FINAL PAIR: {long_asset} (LONG) vs {short_asset} (SHORT)")
            
            total_notional = trade.pair_long_notional + trade.pair_short_notional
            
            # Cap total notional to max $20
            if total_notional > 20:
                logger.warning(f"[PEAR] ⚠️ Total notional ${total_notional} exceeds $20 cap, adjusting...")
                total_notional = 20.0
            
            # Build position request - supports multi-asset baskets with TP/SL
            position_data = {
                "executionType": "MARKET",
                "slippage": 0.08,  # 8% slippage tolerance
                "leverage": trade.pair_long_leverage,
                "usdValue": total_notional,
                "longAssets": long_assets,
                "shortAssets": short_assets,
            }
            
            # Add TP/SL if provided (must be objects with type and value)
            if trade.take_profit_ratio:
                position_data["takeProfit"] = {
                    "type": "PERCENTAGE",
                    "value": abs(trade.take_profit_ratio * 100)
                }
            if trade.stop_loss_ratio:
                position_data["stopLoss"] = {
                    "type": "PERCENTAGE",
                    "value": abs(trade.stop_loss_ratio * 100)
                }
            
            # Log TP/SL values
            if trade.take_profit_ratio:
                logger.info(f"[PEAR]   takeProfit: {abs(trade.take_profit_ratio * 100):.1f}% (PERCENTAGE type)")
            if trade.stop_loss_ratio:
                logger.info(f"[PEAR]   stopLoss: {abs(trade.stop_loss_ratio * 100):.1f}% (PERCENTAGE type)")
            
            logger.info(f"[PEAR] 📦 Position request:")
            logger.info(f"[PEAR]   executionType: MARKET")
            logger.info(f"[PEAR]   leverage: {trade.pair_long_leverage}x")
            logger.info(f"[PEAR]   usdValue: ${total_notional}")
            logger.info(f"[PEAR]   longAssets: {len(long_assets)} asset(s)")
            logger.info(f"[PEAR]   shortAssets: {len(short_assets)} asset(s)")
            logger.info(f"[PEAR] Full payload: {json.dumps(position_data, indent=2)}")
            
            response = requests.post(
                f'{settings.pear_api_url}/positions',
                json=position_data,
                headers={
                    'Authorization': f'Bearer {settings.pear_access_token}',
                    'Content-Type': 'application/json'
                },
                timeout=30
            )
            
            logger.info(f"[PEAR] Response status: {response.status_code}")
            logger.info(f"[PEAR] Response body: {response.text[:1000]}")
            
            if response.status_code in [200, 201]:
                result = response.json()
                order_id = result.get('orderId', result.get('id', 'N/A'))
                logger.info(f"[PEAR] ✅ SUCCESS! Order ID: {order_id}")
                trade.status = "OPEN"
                trade.pear_order_id = str(order_id)
            else:
                error_msg = response.text
                logger.error(f"[PEAR] ❌ API Error ({response.status_code}): {error_msg}")
                
                # Parse error message for user-friendly display
                try:
                    error_json = response.json()
                    user_error = error_json.get('message', error_json.get('error', error_json.get('detail', 'Trade execution failed')))
                    logger.error(f"[PEAR] Parsed error detail: {user_error}")
                except Exception as parse_err:
                    logger.error(f"[PEAR] Failed to parse error JSON: {parse_err}")
                    user_error = "Trade execution failed. Please check your balance and try again."
                
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Pear API error: {user_error}"
                )
                
        except requests.exceptions.Timeout:
            logger.error(f"[PEAR] ⏱️ Request timeout after 30s")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Pear API request timed out. Please try again."
            )
        except requests.exceptions.RequestException as e:
            logger.error(f"[PEAR] 🌐 Network error: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to connect to Pear API: {str(e)}"
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[PEAR] ❌ Unexpected error: {e}")
            logger.exception(e)  # Log full stack trace
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Trade execution failed: {str(e)}"
            )
    else:
        logger.warning("[PEAR] ⚠️ No Pear credentials configured, marking as OPEN (demo mode)")
        trade.status = "OPEN"

    trade.updated_at = datetime.utcnow()
    session.add(trade)
    session.commit()
    session.refresh(trade)

    logger.info(f"[EXECUTE] ✅ Trade {trade_id} executed successfully - status: {trade.status}")
    return trade_to_response(trade)


@app.post(
    "/api/settings/notification",
    response_model=NotificationSettingSchema,
)
def save_notification_setting(
    payload: SaveNotificationSettingRequest, session: Session = Depends(get_session)
) -> Any:
    setting = session.get(NotificationSetting, payload.userId)
    now = datetime.utcnow()

    if not setting:
        setting = NotificationSetting(
            user_id=payload.userId,
            chat_id=payload.chatId,
            frequency=payload.frequency,
            time_of_day=payload.time,
            timezone=payload.timezone or "UTC",
            last_sent_at=None,
            created_at=now,
            updated_at=now,
        )
    else:
        setting.chat_id = payload.chatId
        setting.frequency = payload.frequency
        setting.time_of_day = payload.time
        setting.timezone = payload.timezone or "UTC"
        setting.updated_at = now

    session.add(setting)
    session.commit()
    session.refresh(setting)

    return notification_setting_to_schema(setting)


@app.get(
    "/api/settings/notification/{user_id}",
    response_model=NotificationSettingSchema,
)
def get_notification_setting(
    user_id: str = Path(...), session: Session = Depends(get_session)
) -> Any:
    setting = session.get(NotificationSetting, user_id)
    if not setting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setting not found")
    return notification_setting_to_schema(setting)


@app.get("/api/analytics/statistics")
def get_statistics(
    user_id: Optional[str] = None,
    days: int = 30,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get trade statistics from PostgreSQL
    
    Query params:
    - user_id: Filter by user (optional)
    - days: Number of days to look back (default: 30)
    """
    logger.info(f"[ANALYTICS] 📊 Statistics requested - user_id={user_id}, days={days}")
    return get_trade_statistics(session, user_id, days)


@app.get("/api/analytics/performance")
def get_performance(
    user_id: Optional[str] = None,
    days: int = 30,
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """
    Get performance chart data from PostgreSQL
    
    Query params:
    - user_id: Filter by user (optional)
    - days: Number of days to look back (default: 30)
    """
    logger.info(f"[ANALYTICS] 📈 Performance data requested - user_id={user_id}, days={days}")
    return get_performance_data(session, user_id, days)


@app.get("/health", tags=["health"])
def health() -> dict:
    """Health check endpoint with system status"""
    return {
        "status": "ok",
        "bot_initialized": telegram_app is not None,
        "openai_configured": bool(settings.openai_api_key),
        "pear_configured": bool(settings.pear_access_token),
        "backend_url": BACKEND_BASE,
        "mini_app_url": MINI_APP_URL,
    }


@app.post("/bot/webhook")
async def bot_webhook(request: Request) -> dict:
    """Handle incoming Telegram webhook updates"""
    global telegram_app
    if not telegram_app:
        logger.error("[WEBHOOK] ❌ Bot not initialized")
        raise HTTPException(status_code=500, detail="Bot not initialized")
    try:
        data = await request.json()
        update_id = data.get('update_id', 'unknown')
        
        # Log what type of update we received
        update_type = "unknown"
        if 'message' in data:
            msg = data['message']
            if 'text' in msg:
                update_type = f"message: {msg['text'][:30]}"
            else:
                update_type = "message (no text)"
        elif 'callback_query' in data:
            update_type = "callback_query"
        
        logger.info(f"[WEBHOOK] 📨 Received update #{update_id} - {update_type}")
        
        update = Update.de_json(data=data, bot=telegram_app.bot)
        await telegram_app.process_update(update)
        
        logger.info(f"[WEBHOOK] ✅ Update #{update_id} processed")
        return {"ok": True}
    except Exception as e:
        logger.error(f"[WEBHOOK] ❌ Error processing update: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.on_event("shutdown")
async def on_shutdown() -> None:
    """Cleanup on shutdown"""
    global telegram_app
    logger.info("[SHUTDOWN] Shutting down...")
    if telegram_app:
        logger.info("[SHUTDOWN] Removing webhook and stopping bot...")
        await telegram_app.bot.delete_webhook()
        await telegram_app.stop()
        await telegram_app.shutdown()
        logger.info("[SHUTDOWN] ✅ Bot stopped")
    logger.info("[SHUTDOWN] ✅ Shutdown complete")


def parse_time_of_day(value: Optional[str]) -> Optional[Dict[str, int]]:
    if not value:
        return None
    try:
        hour_str, minute_str = value.split(":")
        return {"hour": int(hour_str), "minute": int(minute_str)}
    except Exception:
        return None


def is_due(setting: NotificationSetting, now_utc: datetime) -> bool:
    freq = (setting.frequency or "never").lower()
    last = setting.last_sent_at
    tz = ZoneInfo(setting.timezone or "UTC")
    now_local = now_utc.replace(tzinfo=timezone.utc).astimezone(tz)
    time_parts = parse_time_of_day(setting.time_of_day) or {"hour": 9, "minute": 0}

    if freq == "never":
        return False

    interval_minutes_map = {
        "1m": 1,
        "5m": 5,
        "15m": 15,
        "1h": 60,
        "2h": 120,
        "4h": 240,
    }

    if freq in interval_minutes_map:
        minutes = interval_minutes_map[freq]
        if not last:
            return True
        return (now_utc - last) >= timedelta(minutes=minutes - 0.5)

    if freq == "daily":
        if not (now_local.hour == time_parts["hour"] and now_local.minute == time_parts["minute"]):
            return False
        if not last:
            return True
        last_local = last.replace(tzinfo=timezone.utc).astimezone(tz)
        return now_local.date() > last_local.date()

    return False


def build_notification_message(
    positions_data: Dict[str, Any], timestamp: datetime, mini_app_url: str
) -> Dict[str, Any]:
    """
    Build notification message from Pear Protocol positions data.
    
    Args:
        positions_data: Parsed positions from parse_positions_for_notification()
        timestamp: Current timestamp
        mini_app_url: URL for the mini app button
    """
    total_pnl = positions_data.get("total_pnl", 0.0)
    total_pnl_pct = positions_data.get("total_pnl_pct", 0.0)
    total_notional = positions_data.get("total_notional", 0.0)
    positions = positions_data.get("positions", [])
    has_positions = positions_data.get("has_positions", False)
    
    # Format PnL with appropriate emoji
    pnl_emoji = "📈" if total_pnl >= 0 else "📉"
    pnl_color = "🟢" if total_pnl >= 0 else "🔴"
    
    lines: List[str] = []
    for pos in positions:
        long_asset = pos.get("long_asset", "")
        short_asset = pos.get("short_asset", "")
        pnl = pos.get("pnl", 0)
        pnl_pct = pos.get("pnl_pct", 0)
        leverage = pos.get("leverage", 1)
        
        # Format pair name
        if short_asset:
            pair_name = f"{long_asset}/{short_asset}"
        else:
            pair_name = long_asset
        
        # Position PnL emoji
        pos_emoji = "🟢" if pnl >= 0 else "🔴"
        
        lines.append(
            f"{pos_emoji} {pair_name} | {leverage}x | {pnl_pct:+.1f}% (${pnl:+.2f})"
        )

    if not has_positions:
        body = "💭 No open positions. Account idle."
    else:
        body = "\n".join(lines)

    header = f"{pnl_emoji} Portfolio Update — {timestamp.strftime('%Y-%m-%d %H:%M UTC')}"
    overview = (
        f"💰 Position Value: ${total_notional:,.2f}\n"
        f"📊 Open Positions: {len(positions)}\n"
        f"{pnl_color} P/L: {total_pnl_pct:+.2f}% (${total_pnl:+,.2f})"
    )

    message = f"{header}\n\n{overview}\n\n{body}\n\nTap below for details."
    
    # Link directly to trades page (home) instead of root
    trades_url = f"{mini_app_url}/trades"
    
    keyboard = {
        "inline_keyboard": [
            [
                {
                    "text": "📱 View Trades",
                    "web_app": {"url": trades_url},
                }
            ]
        ]
    }

    return {"text": message, "reply_markup": keyboard}


async def send_notification(setting: NotificationSetting) -> None:
    """Send PnL notification by fetching real positions from Pear Protocol API."""
    if not settings.bot_token or not telegram_app:
        logger.warning("[Notification] Bot not configured, skipping notification")
        return

    now_utc = datetime.utcnow()
    
    # Fetch real positions from Pear Protocol API
    logger.info(f"[Notification] Fetching positions for user {setting.user_id}")
    raw_positions = await fetch_open_positions(
        api_url=settings.pear_api_url,
        access_token=settings.pear_access_token
    )
    
    # Parse positions for notification format
    positions_data = parse_positions_for_notification(raw_positions)
    
    if not raw_positions.get("success"):
        logger.warning(f"[Notification] Failed to fetch positions: {raw_positions.get('error')}")
        # Still send notification but indicate the error
        positions_data = {
            "total_pnl": 0.0,
            "total_pnl_pct": 0.0,
            "total_notional": 0.0,
            "positions": [],
            "has_positions": False
        }
    
    mini_app_url = MINI_APP_URL or "https://example.com"
    payload = build_notification_message(positions_data, now_utc, mini_app_url)

    try:
        await telegram_app.bot.send_message(
            chat_id=setting.chat_id,
            text=payload["text"],
            reply_markup=payload["reply_markup"],
        )
        logger.info(f"[Notification] Sent to chat {setting.chat_id} - {len(positions_data.get('positions', []))} positions")
    except Exception as e:
        logger.error(f"[Notification] Failed to send to chat {setting.chat_id}: {e}")


async def notification_worker() -> None:
    await asyncio.sleep(2)
    while True:
        now_utc = datetime.utcnow()
        try:
            with Session(engine) as session:
                settings_to_check = session.exec(
                    select(NotificationSetting).where(NotificationSetting.frequency != "never")
                ).all()
                for setting in settings_to_check:
                    if not is_due(setting, now_utc):
                        continue
                    try:
                        await send_notification(setting)
                        setting.last_sent_at = now_utc
                        setting.updated_at = now_utc
                        session.add(setting)
                        session.commit()
                    except Exception:
                        session.rollback()
        except Exception:
            pass
        await asyncio.sleep(60)
