"""
Pear Protocol Basket Trading API
Endpoints for user wallet-based basket trading
"""

import logging
from typing import Dict, List, Any, Optional
from pear_sdk_bridge import PearSDKBridge

logger = logging.getLogger(__name__)


class PearBasketAPI:
    """API for Pear Protocol basket trading with user wallets"""
    
    def __init__(self):
        self.sdk_bridge = PearSDKBridge()
    
    async def authenticate_user_wallet(self, private_key: str) -> Dict[str, Any]:
        """
        Authenticate user's wallet with Pear Protocol
        Returns access token and wallet address
        """
        try:
            result = self.sdk_bridge.authenticate(private_key)
            if result.get('success'):
                logger.info(f"User wallet authenticated: {result.get('walletAddress')}")
            else:
                logger.error(f"Authentication failed: {result.get('error')}")
            return result
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return {"success": False, "error": str(e)}
    
    async def execute_basket_trade(
        self,
        access_token: str,
        long_assets: List[Dict[str, Any]],
        short_assets: List[Dict[str, Any]],
        usd_value: float,
        leverage: int = 1,
        slippage: float = 0.08
    ) -> Dict[str, Any]:
        """
        Execute a basket trade with user's connected wallet
        
        Args:
            access_token: User's Pear Protocol access token
            long_assets: List of {asset: str, weight: float}
            short_assets: List of {asset: str, weight: float}
            usd_value: Position size in USD
            leverage: Leverage (1-100x)
            slippage: Slippage tolerance (0.08 = 8%)
        """
        try:
            logger.info(f"Executing basket trade: ${usd_value} @ {leverage}x leverage")
            logger.info(f"Long: {long_assets}, Short: {short_assets}")
            
            result = self.sdk_bridge.execute_basket_trade(
                access_token=access_token,
                long_assets=long_assets,
                short_assets=short_assets,
                usd_value=usd_value,
                leverage=leverage,
                slippage=slippage
            )
            
            if result.get('success'):
                logger.info(f"Basket trade executed successfully")
            else:
                logger.error(f"Basket trade failed: {result.get('error')}")
            
            return result
        except Exception as e:
            logger.error(f"Basket trade error: {e}")
            return {"success": False, "error": str(e)}
    
    async def execute_agent_signal(
        self,
        access_token: str,
        signal: Dict[str, Any],
        override_usd_value: Optional[float] = None,
        override_leverage: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Execute an Agent Pear signal with user's wallet
        
        Args:
            access_token: User's Pear Protocol access token
            signal: Agent Pear signal object
            override_usd_value: Override suggested USD value
            override_leverage: Override suggested leverage
        """
        try:
            logger.info(f"Executing Agent Pear signal: {signal.get('signalId')}")
            
            result = self.sdk_bridge.execute_agent_signal(
                access_token=access_token,
                signal=signal,
                override_usd_value=override_usd_value,
                override_leverage=override_leverage
            )
            
            if result.get('success'):
                logger.info(f"Agent signal executed successfully")
            else:
                logger.error(f"Agent signal execution failed: {result.get('error')}")
            
            return result
        except Exception as e:
            logger.error(f"Agent signal execution error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_user_positions(self, access_token: str) -> Dict[str, Any]:
        """Get user's open positions"""
        try:
            result = self.sdk_bridge.get_open_positions(access_token)
            if result.get('success'):
                positions = result.get('positions', [])
                logger.info(f"Retrieved {len(positions)} positions")
            return result
        except Exception as e:
            logger.error(f"Get positions error: {e}")
            return {"success": False, "error": str(e)}
    
    async def close_position(
        self,
        access_token: str,
        position_id: str,
        percentage: float = 1.0
    ) -> Dict[str, Any]:
        """Close a position (full or partial)"""
        try:
            logger.info(f"Closing position {position_id} ({percentage * 100}%)")
            
            result = self.sdk_bridge.close_position(
                access_token=access_token,
                position_id=position_id,
                percentage=percentage
            )
            
            if result.get('success'):
                logger.info(f"Position closed successfully")
            else:
                logger.error(f"Close position failed: {result.get('error')}")
            
            return result
        except Exception as e:
            logger.error(f"Close position error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_agent_wallet_status(self, access_token: str) -> Dict[str, Any]:
        """Check agent wallet status"""
        try:
            result = self.sdk_bridge.get_agent_wallet_status(access_token)
            return result
        except Exception as e:
            logger.error(f"Get agent wallet status error: {e}")
            return {"success": False, "error": str(e)}
    
    async def create_agent_wallet(self, access_token: str) -> Dict[str, Any]:
        """Create agent wallet for user"""
        try:
            logger.info("Creating agent wallet")
            result = self.sdk_bridge.create_agent_wallet(access_token)
            
            if result.get('success'):
                logger.info(f"Agent wallet created: {result.get('agentWallet', {}).get('agentWalletAddress')}")
            else:
                logger.error(f"Create agent wallet failed: {result.get('error')}")
            
            return result
        except Exception as e:
            logger.error(f"Create agent wallet error: {e}")
            return {"success": False, "error": str(e)}


# Singleton instance
pear_basket_api = PearBasketAPI()
