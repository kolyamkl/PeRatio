import asyncio
import os
import random
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

import httpx
from fastapi import Depends, FastAPI, HTTPException, Path, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.constants import ParseMode
from telegram.ext import Application, CommandHandler, ContextTypes

from .config import get_settings
from .database import engine, get_session, init_db
from .models import NotificationSetting, Trade
from .schemas import (
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


settings = get_settings()
app = FastAPI(title="PeRatio Mini App Backend", version="0.1.0")
telegram_app: Optional[Application] = None
BACKEND_BASE = settings.backend_url or os.environ.get("BACKEND_URL", "")
MINI_APP_URL = settings.mini_app_url or os.environ.get("MINI_APP_URL", "https://example.com")

print(f"[CONFIG] BOT_TOKEN: {'SET' if settings.bot_token else 'MISSING'}")
print(f"[CONFIG] BACKEND_URL: {BACKEND_BASE}")
print(f"[CONFIG] MINI_APP_URL: {MINI_APP_URL}")


def format_trade_message(trade: Dict[str, Any]) -> tuple[str, InlineKeyboardMarkup]:
    tp = trade.get("takeProfitRatio", 0) * 100
    sl = trade.get("stopLossRatio", 0) * 100
    pair = trade.get("pair", {})
    long_leg = pair.get("long", {})
    short_leg = pair.get("short", {})

    message = (
        "🤖 *AI Pair Trade Recommendation*\n\n"
        "📊 *Pair:*\n"
        f"  LONG: {long_leg.get('symbol')} | ${long_leg.get('notional')} | {long_leg.get('leverage')}x\n"
        f"  SHORT: {short_leg.get('symbol')} | ${short_leg.get('notional')} | {short_leg.get('leverage')}x\n\n"
        f"🎯 Take Profit: *+{tp:.1f}%*\n"
        f"🛡 Stop Loss: *{sl:.1f}%*\n\n"
        f"💡 *Reasoning:*\n{trade.get('reasoning')}\n\n"
        "Tap below to review and confirm ⬇️"
    )

    keyboard = InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton(
                    text="📱 Review & Confirm Trade",
                    web_app={"url": f"{MINI_APP_URL}?tradeId={trade.get('tradeId')}"},
                )
            ]
        ]
    )
    return message, keyboard


async def handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not settings.bot_token:
        return

    user = update.effective_user
    chat_id = update.effective_chat.id if update.effective_chat else None
    if not chat_id:
        return

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Use localhost for internal API calls to avoid tunnel issues
            resp = await client.post(
                "http://localhost:8000/api/llm/generate-trade",
                json={"userId": str(user.id)},
            )
            resp.raise_for_status()
            trade = resp.json()
    except Exception as e:
        print(f"Error in handle_start: {e}")
        await context.bot.send_message(chat_id, "❌ Error generating trade. Please try again.")
        return

    message, keyboard = format_trade_message(trade)
    await context.bot.send_message(
        chat_id,
        message,
        reply_markup=keyboard,
        parse_mode=ParseMode.MARKDOWN,
    )


@app.on_event("startup")
async def on_startup() -> None:
    init_db()
    global telegram_app
    
    bot_token = settings.bot_token
    print(f"[STARTUP] Bot token: {'SET (' + bot_token[:10] + '...)' if bot_token else 'MISSING'}")
    
    if bot_token:
        try:
            print("[STARTUP] Initializing Telegram bot...")
            telegram_app = Application.builder().token(bot_token).build()
            telegram_app.add_handler(CommandHandler("start", handle_start))
            await telegram_app.initialize()
            await telegram_app.start()
            print("[STARTUP] Telegram bot initialized successfully")

            if BACKEND_BASE:
                webhook_url = f"{BACKEND_BASE.rstrip('/')}/bot/webhook"
                try:
                    await telegram_app.bot.delete_webhook()
                    await telegram_app.bot.set_webhook(webhook_url)
                    print(f"[STARTUP] Webhook set to: {webhook_url}")
                except Exception as exc:
                    print(f"[STARTUP] Failed to set webhook: {exc}")
        except Exception as exc:
            print(f"[STARTUP] Failed to initialize bot: {exc}")
            telegram_app = None
    else:
        print("[STARTUP] WARNING: No bot token, bot not initialized")

    try:
        app.state.notification_task = asyncio.create_task(notification_worker())
    except Exception as exc:
        print(f"[STARTUP] Failed to start scheduler: {exc}")


if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(o) for o in settings.cors_origins],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def trade_to_response(trade: Trade) -> TradeSchema:
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
    trade_id = new_trade_id()

    symbols = [
        "BTC-PERP",
        "ETH-PERP",
        "SOL-PERP",
        "AVAX-PERP",
        "MATIC-PERP",
        "ADA-PERP",
        "DOGE-PERP",
        "XRP-PERP",
        "LINK-PERP",
    ]
    long_symbol = random.choice(symbols)
    short_symbol = random.choice([s for s in symbols if s != long_symbol])
    long_notional = round(random.uniform(100, 1000), 2)
    short_notional = round(random.uniform(100, 1000), 2)
    # Use same leverage for both legs (unified leverage)
    leverage = random.choice([1, 2, 3, 5, 7, 10])
    leverage_long = leverage
    leverage_short = leverage
    take_profit_ratio = round(random.uniform(0.02, 0.12), 3)
    stop_loss_ratio = -round(random.uniform(0.01, 0.06), 3)
    reasoning_pool = [
        "Spread widening on momentum factors.",
        "Mean reversion expected after volatility spike.",
        "Funding skew favors this direction.",
        "Correlated leg underperforming; expecting catch-up.",
        "Relative strength divergence detected.",
    ]
    reasoning = random.choice(reasoning_pool)

    trade = Trade(
        trade_id=trade_id,
        user_id=payload.userId,
        pair_long_symbol=long_symbol,
        pair_long_notional=long_notional,
        pair_long_leverage=leverage_long,
        pair_short_symbol=short_symbol,
        pair_short_notional=short_notional,
        pair_short_leverage=leverage_short,
        take_profit_ratio=take_profit_ratio,
        stop_loss_ratio=stop_loss_ratio,
        reasoning=reasoning,
        status="PENDING",
        expires_at=default_expiry(),
    )
    session.add(trade)
    session.commit()

    return trade_to_response(trade)


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


@app.get("/api/trades/{trade_id}", response_model=TradeSchema)
def get_trade(
    trade_id: str = Path(...), session: Session = Depends(get_session)
) -> Any:
    trade = session.exec(select(Trade).where(Trade.trade_id == trade_id)).first()
    if not trade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trade not found")
    return trade_to_response(trade)


@app.post("/api/trades/{trade_id}/execute", response_model=TradeSchema)
def execute_trade(
    payload: ExecuteTradeRequest,
    trade_id: str = Path(...),
    session: Session = Depends(get_session),
) -> Any:
    trade = session.exec(select(Trade).where(Trade.trade_id == trade_id)).first()
    if not trade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trade not found")

    if trade.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Trade already processed"
        )

    if trade.expires_at and trade.expires_at < datetime.utcnow():
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
    trade.status = "OPEN"
    trade.updated_at = datetime.utcnow()

    session.add(trade)
    session.commit()
    session.refresh(trade)

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


@app.get("/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}


@app.post("/bot/webhook")
async def bot_webhook(request: Request) -> dict:
    global telegram_app
    if not telegram_app:
        print("ERROR: Bot not initialized")
        raise HTTPException(status_code=500, detail="Bot not initialized")
    try:
        data = await request.json()
        print(f"Received webhook update: {data.get('update_id', 'unknown')}")
        update = Update.de_json(data=data, bot=telegram_app.bot)
        await telegram_app.process_update(update)
        return {"ok": True}
    except Exception as e:
        print(f"Webhook error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.on_event("shutdown")
async def on_shutdown() -> None:
    global telegram_app
    if telegram_app:
        await telegram_app.bot.delete_webhook()
        await telegram_app.stop()
        await telegram_app.shutdown()


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
    trades: List[Trade], timestamp: datetime, mini_app_url: str
) -> Dict[str, Any]:
    open_trades = [t for t in trades if t.status == "OPEN"]
    total_notional = sum((t.pair_long_notional or 0) + (t.pair_short_notional or 0) for t in open_trades)
    total_positions = len(open_trades)
    total_pnl = 0.0
    total_pnl_pct = 0.0

    lines: List[str] = []
    for t in open_trades:
        lines.append(
            f"- {t.pair_long_symbol} vs {t.pair_short_symbol} | {t.pair_long_leverage}x/{t.pair_short_leverage}x | TP {t.take_profit_ratio*100:.1f}% | SL {t.stop_loss_ratio*100:.1f}%"
        )

    if not lines:
        body = "No open positions. Account idle."
    else:
        body = "\n".join(lines)

    header = f"📈 Portfolio Update — {timestamp.strftime('%Y-%m-%d %H:%M UTC')}"
    overview = (
        f"Balance (est): ${total_notional:,.2f}\n"
        f"Open Positions: {total_positions}\n"
        f"P/L: {total_pnl_pct:+.2f}% (${total_pnl:,.2f})"
    )

    message = f"{header}\n\n{overview}\n\n{body}\n\nTap below for details."
    keyboard = {
        "inline_keyboard": [
            [
                {
                    "text": "View Dashboard",
                    "web_app": {"url": mini_app_url},
                }
            ]
        ]
    }

    return {"text": message, "reply_markup": keyboard}


async def send_notification(setting: NotificationSetting) -> None:
    if not settings.bot_token or not telegram_app:
        return

    now_utc = datetime.utcnow()
    with Session(engine) as session:
        trades = session.exec(select(Trade).where(Trade.user_id == setting.user_id)).all()

    mini_app_url = MINI_APP_URL or "https://example.com"
    payload = build_notification_message(trades, now_utc, mini_app_url)

    await telegram_app.bot.send_message(
        chat_id=setting.chat_id,
        text=payload["text"],
        reply_markup=payload["reply_markup"],
    )


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
