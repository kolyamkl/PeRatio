"""
Core application modules.

This package contains the core configuration, database, models, and schemas
for the TG_TRADE backend application.
"""

from .config import Settings, get_settings
from .database import engine, get_session, init_db
from .models import NotificationSetting, Trade
from .schemas import (
    BasketAssetSchema,
    BasketAsset,
    PairLegSchema,
    TradeSchema,
    GenerateTradeRequest,
    GenerateTradeResponse,
    ExecuteTradeRequest,
    ParseTradeMessageRequest,
    NotificationSettingSchema,
    SaveNotificationSettingRequest,
    default_expiry,
    new_trade_id,
)

__all__ = [
    "Settings",
    "get_settings",
    "engine",
    "get_session",
    "init_db",
    "NotificationSetting",
    "Trade",
    "BasketAssetSchema",
    "BasketAsset",
    "PairLegSchema",
    "TradeSchema",
    "GenerateTradeRequest",
    "GenerateTradeResponse",
    "ExecuteTradeRequest",
    "ParseTradeMessageRequest",
    "NotificationSettingSchema",
    "SaveNotificationSettingRequest",
    "default_expiry",
    "new_trade_id",
]
