import logging
import os
from typing import Any, Dict

import httpx
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.constants import ParseMode
from telegram.ext import Application, CommandHandler, ContextTypes

from .config import get_settings


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pear.bot")

settings = get_settings()
BACKEND_URL = os.environ.get("BACKEND_URL", settings.backend_url or "http://localhost:8000")
MINI_APP_URL = os.environ.get("MINI_APP_URL", settings.mini_app_url or "https://your-domain.com/app")
BOT_TOKEN = os.environ.get("BOT_TOKEN", settings.bot_token)


def format_trade_message(trade: Dict[str, Any]) -> str:
    tp = trade.get("takeProfitRatio", 0) * 100
    sl = trade.get("stopLossRatio", 0) * 100
    pair = trade.get("pair", {})
    long_leg = pair.get("long", {})
    short_leg = pair.get("short", {})

    return (
        "\\ud83e\\udd16 *AI Pair Trade Recommendation*\\n\\n"
        "\\ud83d\\udcca *Pair:*\\n"
        f"  LONG: {long_leg.get('symbol')} | ${long_leg.get('notional')} | {long_leg.get('leverage')}x\\n"
        f"  SHORT: {short_leg.get('symbol')} | ${short_leg.get('notional')} | {short_leg.get('leverage')}x\\n\\n"
        f"\\ud83c\\udfaf Take Profit: +{tp:.1f}%\\n"
        f"\\ud83d\\udee1 Stop Loss: {sl:.1f}%\\n\\n"
        f"\\ud83d\\udca1 Reasoning:\\n{trade.get('reasoning')}\\n\\n"
        "Tap below to review and confirm \\u2b07\\ufe0f"
    )


async def handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not BOT_TOKEN:
        logger.error("BOT_TOKEN is missing")
        return

    user = update.effective_user
    chat_id = update.effective_chat.id if update.effective_chat else None
    if not chat_id:
        return

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/llm/generate-trade",
                json={"userId": str(user.id)},
            )
            resp.raise_for_status()
            trade = resp.json()
    except Exception as exc:  # noqa: BLE001
        logger.exception("generate-trade failed")
        await context.bot.send_message(chat_id, "❌ Error generating trade. Please try again.")
        return

    trade_id = trade.get("tradeId")
    message = format_trade_message(trade)
    keyboard = InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton(
                    text="📱 Review & Confirm Trade",
                    web_app={"url": f"{MINI_APP_URL}?tradeId={trade_id}"},
                )
            ]
        ]
    )

    await context.bot.send_message(
        chat_id,
        message,
        reply_markup=keyboard,
        parse_mode=ParseMode.MARKDOWN,
    )


def main() -> None:
    if not BOT_TOKEN:
        raise RuntimeError("BOT_TOKEN is not set")

    application = Application.builder().token(BOT_TOKEN).build()
    application.add_handler(CommandHandler("start", handle_start))
    application.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
