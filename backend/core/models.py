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


class WalletUser(SQLModel, table=True):
    """
    Links wallet addresses to Telegram users for notifications.
    Many-to-many: One user can have multiple wallets, one wallet can be used by multiple users.
    Composite primary key: (wallet_address, telegram_user_id)
    """
    id: Optional[int] = Field(default=None, primary_key=True)  # Auto-increment ID
    wallet_address: str = Field(index=True)  # Ethereum address (lowercase)
    telegram_user_id: str = Field(index=True)  # Telegram user ID
    telegram_chat_id: str  # Telegram chat ID for sending messages
    telegram_username: Optional[str] = Field(default=None)  # @username if available
    pear_access_token: Optional[str] = Field(default=None)  # User's Pear Protocol access token for fetching positions
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class AgentPearSignal(SQLModel, table=True):
    """
    Stores all Agent Pear signals from Telegram for metrics calculation.
    Both OPEN signals and CLOSE signals are stored to track performance.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    message_id: int = Field(index=True, unique=True)  # Telegram message ID
    signal_type: str = Field(index=True)  # "OPEN" or "CLOSE"
    
    # Pair info
    long_asset: str = Field(index=True)
    short_asset: str = Field(index=True)
    
    # Entry data (for OPEN signals)
    entry_price: Optional[float] = Field(default=None)
    z_score: Optional[float] = Field(default=None)
    rolling_z_score: Optional[float] = Field(default=None)
    correlation: Optional[float] = Field(default=None)
    cointegration: Optional[bool] = Field(default=None)
    hedge_ratio: Optional[float] = Field(default=None)
    long_weight: Optional[float] = Field(default=None)  # e.g., 55.7%
    short_weight: Optional[float] = Field(default=None)  # e.g., 44.3%
    expected_reversion_days: Optional[float] = Field(default=None)
    backtest_win_rate: Optional[float] = Field(default=None)
    platforms: Optional[str] = Field(default=None)  # "SYMMIO, HYPERLIQUID"
    timeframe: Optional[str] = Field(default=None)  # "1h", "4h", etc.
    
    # Exit data (for CLOSE signals)
    exit_price: Optional[float] = Field(default=None)
    entry_z_score: Optional[float] = Field(default=None)  # z-score at entry
    exit_z_score: Optional[float] = Field(default=None)  # z-score at exit
    result: Optional[str] = Field(default=None, index=True)  # "profit" or "loss"
    max_returns_pct: Optional[float] = Field(default=None)  # Max attainable returns %
    leverage_used: Optional[int] = Field(default=None)  # e.g., 54x
    close_reason: Optional[str] = Field(default=None)  # "mean reversion", "stop loss", etc.
    
    # Linked open signal (for CLOSE signals)
    linked_open_message_id: Optional[int] = Field(default=None, index=True)
    
    # Timestamps
    signal_date: datetime = Field(index=True)  # Date from Telegram message
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    
    # Raw message for reference
    raw_message: Optional[str] = Field(default=None)
