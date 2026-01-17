from datetime import datetime
from typing import Optional, List, Dict, Any
import json

from sqlmodel import Field, SQLModel


class BasketAsset(SQLModel):
    """Single asset in a basket"""
    coin: str
    weight: float
    notional: float = 0.0


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
    pear_order_id: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    expires_at: Optional[datetime] = Field(default=None, index=True)
    # Multi-basket fields (JSON strings)
    long_basket_json: Optional[str] = Field(default=None)  # JSON: [{"coin": "BTC", "weight": 0.5, "notional": 100}]
    short_basket_json: Optional[str] = Field(default=None)  # JSON: [{"coin": "ETH", "weight": 0.5, "notional": 100}]
    basket_category: Optional[str] = Field(default=None)  # LAYER1_VS_LAYER2, BLUECHIP_VS_ALTS, etc.
    confidence: Optional[float] = Field(default=None)  # 0-10 scale
    factor_analysis_json: Optional[str] = Field(default=None)  # JSON with all factor scores
    
    def get_long_basket(self) -> List[Dict[str, Any]]:
        """Parse long basket from JSON"""
        if self.long_basket_json:
            return json.loads(self.long_basket_json)
        return [{"coin": self.pair_long_symbol.replace("-PERP", ""), "weight": 1.0, "notional": self.pair_long_notional}]
    
    def get_short_basket(self) -> List[Dict[str, Any]]:
        """Parse short basket from JSON"""
        if self.short_basket_json:
            return json.loads(self.short_basket_json)
        return [{"coin": self.pair_short_symbol.replace("-PERP", ""), "weight": 1.0, "notional": self.pair_short_notional}]
    
    def get_factor_analysis(self) -> Optional[Dict[str, Any]]:
        """Parse factor analysis from JSON"""
        if self.factor_analysis_json:
            return json.loads(self.factor_analysis_json)
        return None

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
