from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class PairLeg(SQLModel):
    symbol: str
    notional: float
    leverage: int


class TradePayload(SQLModel):
    pair_long: PairLeg
    pair_short: PairLeg
    take_profit_ratio: float
    stop_loss_ratio: float
    reasoning: str


class Trade(SQLModel, table=True):
    trade_id: str = Field(primary_key=True, index=True)
    user_id: str = Field(index=True)
    pair_long_symbol: str
    pair_long_notional: float
    pair_long_leverage: int
    pair_short_symbol: str
    pair_short_notional: float
    pair_short_leverage: int
    take_profit_ratio: float
    stop_loss_ratio: float
    reasoning: str
    status: str = Field(default="PENDING", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    expires_at: Optional[datetime] = Field(default=None, index=True)

    def to_payload(self) -> TradePayload:
        return TradePayload(
            pair_long=PairLeg(
                symbol=self.pair_long_symbol,
                notional=self.pair_long_notional,
                leverage=self.pair_long_leverage,
            ),
            pair_short=PairLeg(
                symbol=self.pair_short_symbol,
                notional=self.pair_short_notional,
                leverage=self.pair_short_leverage,
            ),
            take_profit_ratio=self.take_profit_ratio,
            stop_loss_ratio=self.stop_loss_ratio,
            reasoning=self.reasoning,
        )


class NotificationSetting(SQLModel, table=True):
    user_id: str = Field(primary_key=True, index=True)
    chat_id: str
    frequency: str = Field(default="never", index=True)  # never, 1m,5m,15m,1h,2h,4h,daily
    time_of_day: Optional[str] = Field(default=None)  # "HH:MM" in 24h format
    timezone: str = Field(default="UTC")
    last_sent_at: Optional[datetime] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)
