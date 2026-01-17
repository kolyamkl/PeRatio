from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field, validator


class PairLegSchema(BaseModel):
    symbol: str
    notional: float
    leverage: int


class TradeSchema(BaseModel):
    tradeId: str = Field(..., alias="tradeId")
    pair: dict
    takeProfitRatio: float
    stopLossRatio: float
    reasoning: str
    status: str
    expiresAt: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True


class GenerateTradeRequest(BaseModel):
    userId: str
    context: Optional[str] = None


class GenerateTradeResponse(TradeSchema):
    pass


class ExecuteTradeRequest(BaseModel):
    pair: dict
    takeProfitRatio: float
    stopLossRatio: float

    @validator("takeProfitRatio", "stopLossRatio")
    def ratios_reasonable(cls, v: float) -> float:
        if abs(v) > 1:
            raise ValueError("Ratios should be in decimal form (e.g., 0.05 for 5%)")
        return v


def new_trade_id() -> str:
    return f"tr_{uuid4().hex[:10]}"


def default_expiry(minutes: int = 10) -> datetime:
    return datetime.utcnow() + timedelta(minutes=minutes)


class ParseTradeMessageRequest(BaseModel):
    userId: str
    chatId: str
    message: str
    reasoning: Optional[str] = None


class NotificationSettingSchema(BaseModel):
    userId: str
    chatId: str
    frequency: str  # never, 1m,5m,15m,1h,2h,4h,daily
    time: Optional[str] = None  # HH:MM
    timezone: str
    lastSentAt: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True


class SaveNotificationSettingRequest(BaseModel):
    userId: str
    chatId: str
    frequency: str
    time: Optional[str] = None
    timezone: str
