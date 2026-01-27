"""
FastAPI endpoints for Pear Protocol basket trading
"""

from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from pear_basket_api import pear_basket_api
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/basket", tags=["basket"])


# Request/Response Models
class AssetWeight(BaseModel):
    asset: str = Field(..., description="Asset symbol (e.g., BTC, ETH)")
    weight: float = Field(..., ge=0, le=1, description="Weight (0.0 to 1.0)")


class BasketTradeRequest(BaseModel):
    longAssets: List[AssetWeight] = Field(default_factory=list)
    shortAssets: List[AssetWeight] = Field(default_factory=list)
    usdValue: float = Field(..., ge=10, description="Position size in USD (min $10)")
    leverage: int = Field(1, ge=1, le=100, description="Leverage (1-100x)")
    slippage: float = Field(0.08, ge=0, le=1, description="Slippage tolerance (0.08 = 8%)")


class AgentSignalExecuteRequest(BaseModel):
    signal: Dict[str, Any] = Field(..., description="Agent Pear signal object")
    overrideUsdValue: Optional[float] = Field(None, ge=10)
    overrideLeverage: Optional[int] = Field(None, ge=1, le=100)


class ClosePositionRequest(BaseModel):
    positionId: str
    percentage: float = Field(1.0, ge=0, le=1, description="Percentage to close (1.0 = 100%)")


# Authentication is handled in frontend via pearAuth.ts
# Frontend signs EIP-712 message with user's wallet and gets access token
# Backend endpoints only receive and validate the access token


@router.post("/execute")
async def execute_basket_trade(
    request: BasketTradeRequest,
    authorization: str = Header(..., description="Bearer {accessToken}")
) -> Dict[str, Any]:
    """
    Execute a basket trade with user's connected wallet
    Requires Authorization header with access token
    """
    try:
        # Extract token from Bearer header
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        access_token = authorization.replace("Bearer ", "")
        
        # Convert to SDK format
        long_assets = [{"asset": a.asset.upper(), "weight": a.weight} for a in request.longAssets]
        short_assets = [{"asset": a.asset.upper(), "weight": a.weight} for a in request.shortAssets]
        
        result = await pear_basket_api.execute_basket_trade(
            access_token=access_token,
            long_assets=long_assets,
            short_assets=short_assets,
            usd_value=request.usdValue,
            leverage=request.leverage,
            slippage=request.slippage
        )
        
        if not result.get('success'):
            raise HTTPException(status_code=400, detail=result.get('error', 'Trade execution failed'))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Execute basket trade error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute-signal")
async def execute_agent_signal(
    request: AgentSignalExecuteRequest,
    authorization: str = Header(..., description="Bearer {accessToken}")
) -> Dict[str, Any]:
    """
    Execute an Agent Pear signal with user's wallet
    """
    try:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        access_token = authorization.replace("Bearer ", "")
        
        result = await pear_basket_api.execute_agent_signal(
            access_token=access_token,
            signal=request.signal,
            override_usd_value=request.overrideUsdValue,
            override_leverage=request.overrideLeverage
        )
        
        if not result.get('success'):
            raise HTTPException(status_code=400, detail=result.get('error', 'Signal execution failed'))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Execute signal error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions")
async def get_positions(
    authorization: str = Header(..., description="Bearer {accessToken}")
) -> Dict[str, Any]:
    """
    Get user's open positions
    """
    try:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        access_token = authorization.replace("Bearer ", "")
        
        result = await pear_basket_api.get_user_positions(access_token)
        
        if not result.get('success'):
            raise HTTPException(status_code=400, detail=result.get('error', 'Failed to get positions'))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get positions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/close-position")
async def close_position(
    request: ClosePositionRequest,
    authorization: str = Header(..., description="Bearer {accessToken}")
) -> Dict[str, Any]:
    """
    Close a position (full or partial)
    """
    try:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        access_token = authorization.replace("Bearer ", "")
        
        result = await pear_basket_api.close_position(
            access_token=access_token,
            position_id=request.positionId,
            percentage=request.percentage
        )
        
        if not result.get('success'):
            raise HTTPException(status_code=400, detail=result.get('error', 'Failed to close position'))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Close position error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agent-wallet/status")
async def get_agent_wallet_status(
    authorization: str = Header(..., description="Bearer {accessToken}")
) -> Dict[str, Any]:
    """
    Check agent wallet status
    """
    try:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        access_token = authorization.replace("Bearer ", "")
        
        result = await pear_basket_api.get_agent_wallet_status(access_token)
        
        if not result.get('success'):
            raise HTTPException(status_code=400, detail=result.get('error', 'Failed to get agent wallet status'))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get agent wallet status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agent-wallet/create")
async def create_agent_wallet(
    authorization: str = Header(..., description="Bearer {accessToken}")
) -> Dict[str, Any]:
    """
    Create agent wallet for user
    """
    try:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        access_token = authorization.replace("Bearer ", "")
        
        result = await pear_basket_api.create_agent_wallet(access_token)
        
        if not result.get('success'):
            raise HTTPException(status_code=400, detail=result.get('error', 'Failed to create agent wallet'))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create agent wallet error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
