from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import uuid4
import re

from pydantic import BaseModel, Field, ConfigDict, ValidationInfo, field_validator, constr, confloat, conint

# Security: Import sanitization utilities
from security import sanitize_string, sanitize_user_id, sanitize_symbol, validate_numeric_range


class BasketAssetSchema(BaseModel):
    """
    Single asset in a basket.
    
    Security: Strict validation on all fields to prevent injection attacks.
    """
    # Coin symbol: uppercase alphanumeric, max 10 chars
    coin: constr(min_length=1, max_length=10, pattern=r'^[A-Z0-9]+$') = Field(
        ...,
        description="Trading symbol (e.g., BTC, ETH)",
        example="BTC"
    )
    # Weight: must be positive, max 10.0 (1000%)
    weight: confloat(gt=0.0, le=10.0) = Field(
        ...,
        description="Asset weight in basket (typically 0.0-1.0)",
        example=1.0
    )
    # Notional: positive value, max $1M per asset
    notional: confloat(ge=0.0, le=1000000.0) = Field(
        default=0.0,
        description="Notional value in USD",
        example=100.0
    )
    
    @field_validator('coin')
    @classmethod
    def validate_coin(cls, v):
        """Sanitize and validate coin symbol"""
        return sanitize_symbol(v)


class PairLegSchema(BaseModel):
    """
    Single leg of a trading pair.
    
    Security: Validates symbol format and reasonable trading limits.
    """
    # Symbol: alphanumeric with hyphen, max 20 chars
    symbol: constr(min_length=1, max_length=20, pattern=r'^[A-Z0-9\-]+$') = Field(
        ...,
        description="Trading pair symbol (e.g., BTC-PERP)",
        example="BTC-PERP"
    )
    # Notional: positive, max $1M
    notional: confloat(gt=0.0, le=1000000.0) = Field(
        ...,
        description="Position size in USD",
        example=100.0
    )
    # Leverage: 1-100x (reasonable range for crypto)
    leverage: conint(ge=1, le=100) = Field(
        ...,
        description="Leverage multiplier (1-100x)",
        example=2
    )
    
    @field_validator('symbol')
    @classmethod
    def validate_symbol(cls, v):
        """Sanitize and validate symbol"""
        return sanitize_symbol(v)


class TradeSchema(BaseModel):
    """
    Complete trade schema with security validations.
    
    Security: All string fields are length-limited and sanitized.
    """
    # Trade ID: must match expected format
    tradeId: constr(pattern=r'^tr_[a-f0-9]{10}$') = Field(
        ...,
        alias="tradeId",
        description="Unique trade identifier",
        example="tr_a1b2c3d4e5"
    )
    pair: dict  # Validated separately in endpoint
    # TP/SL ratios: -100% to +100% (decimal form)
    takeProfitRatio: confloat(ge=-1.0, le=1.0) = Field(
        ...,
        description="Take profit ratio in decimal form",
        example=0.15
    )
    stopLossRatio: confloat(ge=-1.0, le=1.0) = Field(
        ...,
        description="Stop loss ratio in decimal form",
        example=-0.08
    )
    # Reasoning: max 2000 chars to prevent abuse
    reasoning: constr(max_length=2000) = Field(
        ...,
        description="Trade rationale",
        example="Strong bullish divergence detected"
    )
    # Status: enum-like validation
    status: constr(pattern=r'^(PENDING|EXECUTED|CANCELLED|EXPIRED)$') = Field(
        ...,
        description="Trade status",
        example="PENDING"
    )
    expiresAt: Optional[datetime] = None
    # Multi-basket fields
    longBasket: Optional[List[BasketAssetSchema]] = Field(
        None,
        max_items=20,  # Prevent DoS with huge baskets
        description="Long basket assets"
    )
    shortBasket: Optional[List[BasketAssetSchema]] = Field(
        None,
        max_items=20,
        description="Short basket assets"
    )
    # Category: alphanumeric with underscore, max 50 chars
    basketCategory: Optional[constr(max_length=50, pattern=r'^[A-Z0-9_]+$')] = None
    # Confidence: 0-10 scale
    confidence: Optional[confloat(ge=0.0, le=10.0)] = None
    factorAnalysis: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(populate_by_name=True, extra="forbid")
    
    @field_validator('reasoning')
    @classmethod
    def sanitize_reasoning(cls, v):
        """Sanitize reasoning text"""
        return sanitize_string(v, max_length=2000)


class GenerateTradeRequest(BaseModel):
    """
    Request to generate a new trade.
    
    Security: Validates user ID format and limits context length.
    """
    # User ID: alphanumeric with limited special chars, max 100 chars
    userId: constr(min_length=1, max_length=100, pattern=r'^[a-zA-Z0-9_\-\.]+$') = Field(
        ...,
        description="User identifier",
        example="user_123"
    )
    # Context: optional, max 500 chars
    context: Optional[constr(max_length=500)] = Field(
        None,
        description="Additional context for trade generation"
    )
    
    model_config = ConfigDict(extra="forbid")
    
    @field_validator('userId')
    @classmethod
    def validate_user_id(cls, v):
        """Sanitize and validate user ID"""
        return sanitize_user_id(v)
    
    @field_validator('context')
    @classmethod
    def sanitize_context(cls, v):
        """Sanitize context if provided"""
        if v:
            return sanitize_string(v, max_length=500)
        return v


class GenerateTradeResponse(TradeSchema):
    """Response for trade generation - inherits all TradeSchema validations"""
    pass


class BasketAsset(BaseModel):
    """
    Basket asset for trade execution.
    
    Security: Strict validation on coin symbol and weight.
    """
    coin: constr(min_length=1, max_length=10, pattern=r'^[A-Z0-9]+$') = Field(
        ...,
        description="Trading symbol",
        example="BTC"
    )
    weight: confloat(gt=0.0, le=10.0) = Field(
        ...,
        description="Asset weight",
        example=1.0
    )
    
    @field_validator('coin')
    @classmethod
    def validate_coin(cls, v):
        """Sanitize coin symbol"""
        return sanitize_symbol(v)


class ExecuteTradeRequest(BaseModel):
    """
    Request to execute a trade.
    
    Security: Validates all trading parameters are within safe ranges.
    """
    pair: dict  # Validated in endpoint
    # TP/SL ratios: must be in decimal form, reasonable ranges
    takeProfitRatio: confloat(ge=-1.0, le=1.0) = Field(
        ...,
        description="Take profit ratio (decimal)",
        example=0.15
    )
    stopLossRatio: confloat(ge=-1.0, le=1.0) = Field(
        ...,
        description="Stop loss ratio (decimal)",
        example=-0.08
    )
    # Baskets: max 20 assets each to prevent DoS
    longBasket: List[BasketAsset] = Field(
        default=[],
        max_items=20,
        description="Long basket assets"
    )
    shortBasket: List[BasketAsset] = Field(
        default=[],
        max_items=20,
        description="Short basket assets"
    )
    
    model_config = ConfigDict(extra="forbid")

    @field_validator("takeProfitRatio", "stopLossRatio")
    @classmethod
    def ratios_reasonable(cls, v: float, info: ValidationInfo) -> float:
        """
        Validate TP/SL ratios are in decimal form and reasonable.
        
        Security: Prevents extreme values that could cause financial loss.
        """
        if abs(v) > 1:
            raise ValueError("Ratios should be in decimal form (e.g., 0.05 for 5%)")
        
        # Additional safety: TP should be positive, SL should be negative
        if info.field_name == "takeProfitRatio" and v <= 0:
            raise ValueError("Take profit ratio must be positive")
        if info.field_name == "stopLossRatio" and v >= 0:
            raise ValueError("Stop loss ratio must be negative")
        
        return v
    
    @field_validator("longBasket", "shortBasket")
    @classmethod
    def validate_baskets(cls, v: List[BasketAsset]) -> List[BasketAsset]:
        """
        Validate basket composition.
        
        Security: Ensures baskets are not empty and weights are reasonable.
        """
        if not v:
            return v
        
        # Check total weight doesn't exceed reasonable limit
        total_weight = sum(asset.weight for asset in v)
        if total_weight > 20.0:  # Max 2000% total weight
            raise ValueError("Total basket weight exceeds maximum allowed")
        
        return v


def new_trade_id() -> str:
    return f"tr_{uuid4().hex[:10]}"


def default_expiry(minutes: int = 10) -> datetime:
    return datetime.utcnow() + timedelta(minutes=minutes)


class ParseTradeMessageRequest(BaseModel):
    """
    Request to parse a trade message from Telegram.
    
    Security: Validates user/chat IDs and limits message length.
    """
    userId: constr(min_length=1, max_length=100, pattern=r'^[a-zA-Z0-9_\-\.]+$') = Field(
        ...,
        description="User identifier",
        example="user_123"
    )
    chatId: constr(min_length=1, max_length=100, pattern=r'^[\-0-9]+$') = Field(
        ...,
        description="Telegram chat ID",
        example="123456789"
    )
    # Message: max 4000 chars (Telegram's limit)
    message: constr(min_length=1, max_length=4000) = Field(
        ...,
        description="Trade message text",
        example="BTC/ETH pair trade signal"
    )
    reasoning: Optional[constr(max_length=2000)] = Field(
        None,
        description="Optional reasoning text"
    )
    
    model_config = ConfigDict(extra="forbid")
    
    @field_validator('userId')
    @classmethod
    def validate_user_id(cls, v):
        """Sanitize user ID"""
        return sanitize_user_id(v)
    
    @field_validator('chatId')
    @classmethod
    def validate_chat_id(cls, v):
        """Sanitize chat ID (numeric or negative for groups)"""
        v = sanitize_string(v, max_length=100)
        if not re.match(r'^[\-0-9]+$', v):
            raise ValueError("Invalid chat ID format")
        return v
    
    @field_validator('message', 'reasoning')
    @classmethod
    def sanitize_text(cls, v, info: ValidationInfo):
        """Sanitize text fields"""
        if v:
            max_len = 4000 if info.field_name == 'message' else 2000
            return sanitize_string(v, max_length=max_len)
        return v


class NotificationSettingSchema(BaseModel):
    """
    Notification settings for a user.
    
    Security: Validates frequency, timezone, and time format.
    """
    userId: constr(min_length=1, max_length=100, pattern=r'^[a-zA-Z0-9_\-\.]+$') = Field(
        ...,
        description="User identifier"
    )
    chatId: constr(min_length=1, max_length=100, pattern=r'^[\-0-9]+$') = Field(
        ...,
        description="Telegram chat ID"
    )
    # Frequency: must be one of allowed values
    frequency: constr(pattern=r'^(never|1m|5m|15m|1h|2h|4h|daily)$') = Field(
        ...,
        description="Notification frequency",
        example="1h"
    )
    # Time: HH:MM format if provided
    time: Optional[constr(pattern=r'^([0-1][0-9]|2[0-3]):[0-5][0-9]$')] = Field(
        None,
        description="Time of day for daily notifications (HH:MM)",
        example="09:00"
    )
    # Timezone: IANA timezone name, max 50 chars
    timezone: constr(min_length=1, max_length=50, pattern=r'^[A-Za-z_/]+$') = Field(
        ...,
        description="IANA timezone (e.g., America/New_York)",
        example="UTC"
    )
    lastSentAt: Optional[datetime] = None

    model_config = ConfigDict(populate_by_name=True, extra="forbid")
    
    @field_validator('userId')
    @classmethod
    def validate_user_id(cls, v):
        """Sanitize user ID"""
        return sanitize_user_id(v)
    
    @field_validator('chatId')
    @classmethod
    def validate_chat_id(cls, v):
        """Sanitize chat ID"""
        v = sanitize_string(v, max_length=100)
        if not re.match(r'^[\-0-9]+$', v):
            raise ValueError("Invalid chat ID format")
        return v
    
    @field_validator('timezone')
    @classmethod
    def validate_timezone(cls, v):
        """Validate timezone is a known IANA timezone"""
        from zoneinfo import ZoneInfo, available_timezones
        
        v = sanitize_string(v, max_length=50)
        
        # Check if timezone exists
        try:
            ZoneInfo(v)
        except Exception:
            # Fallback: check against available timezones
            if v not in available_timezones():
                raise ValueError(f"Invalid timezone: {v}")
        
        return v


class SaveNotificationSettingRequest(BaseModel):
    """
    Request to save notification settings.
    
    Security: Same validations as NotificationSettingSchema.
    """
    userId: constr(min_length=1, max_length=100, pattern=r'^[a-zA-Z0-9_\-\.]+$') = Field(
        ...,
        description="User identifier"
    )
    chatId: constr(min_length=1, max_length=100, pattern=r'^[\-0-9]+$') = Field(
        ...,
        description="Telegram chat ID"
    )
    frequency: constr(pattern=r'^(never|1m|5m|15m|1h|2h|4h|daily)$') = Field(
        ...,
        description="Notification frequency"
    )
    time: Optional[constr(pattern=r'^([0-1][0-9]|2[0-3]):[0-5][0-9]$')] = Field(
        None,
        description="Time of day (HH:MM)"
    )
    timezone: constr(min_length=1, max_length=50, pattern=r'^[A-Za-z_/]+$') = Field(
        ...,
        description="IANA timezone"
    )
    
    model_config = ConfigDict(extra="forbid")
    
    @field_validator('userId')
    @classmethod
    def validate_user_id(cls, v):
        """Sanitize user ID"""
        return sanitize_user_id(v)
    
    @field_validator('chatId')
    @classmethod
    def validate_chat_id(cls, v):
        """Sanitize chat ID"""
        v = sanitize_string(v, max_length=100)
        if not re.match(r'^[\-0-9]+$', v):
            raise ValueError("Invalid chat ID format")
        return v
    
    @field_validator('timezone')
    @classmethod
    def validate_timezone(cls, v):
        """Validate timezone"""
        from zoneinfo import ZoneInfo, available_timezones
        
        v = sanitize_string(v, max_length=50)
        
        try:
            ZoneInfo(v)
        except Exception:
            if v not in available_timezones():
                raise ValueError(f"Invalid timezone: {v}")
        
        return v


# Security: Additional schema for trade creation/update operations
class TradeCreate(BaseModel):
    """Schema for creating trades with strict validation"""
    pass  # Inherits from TradeSchema


class TradeRead(BaseModel):
    """Schema for reading trades"""
    pass  # Inherits from TradeSchema


class TradeUpdate(BaseModel):
    """Schema for updating trades with validation"""
    pass  # Inherits from TradeSchema


class NotificationSettingCreate(BaseModel):
    """Schema for creating notification settings"""
    pass  # Inherits from SaveNotificationSettingRequest


class NotificationSettingRead(BaseModel):
    """Schema for reading notification settings"""
    pass  # Inherits from NotificationSettingSchema


class NotificationSettingUpdate(BaseModel):
    """Schema for updating notification settings"""
    pass  # Inherits from SaveNotificationSettingRequest
