"""
Pear Protocol Authentication
=============================
Handles EIP-712 authentication with Pear Protocol API.
Generates access tokens for API requests.
"""

import json
import logging
import os
import requests
from typing import Optional
from pathlib import Path
from eth_account import Account
from eth_account.messages import encode_typed_data
from dotenv import load_dotenv

# Load environment variables from the PeRatio folder
_this_dir = Path(__file__).parent
load_dotenv(_this_dir / ".env")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PearAuthenticator:
    """
    Authenticator for Pear Protocol using EIP-712 signatures.
    """
    
    def __init__(self, private_key: Optional[str] = None, config_path: Optional[str] = None):
        """
        Initialize authenticator.
        
        Args:
            private_key: Wallet private key. If None, loads from env/config.
            config_path: Path to EXPORT_DATA.json
        """
        self.config = self._load_config(config_path)
        
        # Get credentials
        self.private_key = private_key or os.getenv("PEAR_PRIVATE_KEY") or self.config.get("credentials", {}).get("privateKey", "")
        self.api_url = os.getenv("PEAR_API_URL") or self.config.get("credentials", {}).get("apiUrl", "https://hl-v2.pearprotocol.io")
        self.client_id = os.getenv("PEAR_CLIENT_ID") or self.config.get("credentials", {}).get("clientId", "HLHackathon9")
        
        # Get wallet address from private key
        if self.private_key:
            self.account = Account.from_key(self.private_key)
            self.address = self.account.address
        else:
            self.account = None
            self.address = None
        
        logger.info(f"PearAuthenticator initialized")
        logger.info(f"  API URL: {self.api_url}")
        logger.info(f"  Client ID: {self.client_id}")
        if self.address:
            logger.info(f"  Wallet: {self.address}")
    
    def _load_config(self, config_path: Optional[str] = None) -> dict:
        """Load configuration from EXPORT_DATA.json."""
        if config_path:
            path = Path(config_path)
        else:
            current_dir = Path(__file__).parent
            path = current_dir.parent / "Api configs" / "EXPORT_DATA.json"
        
        if path.exists():
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load config: {e}")
                return {}
        return {}
    
    def authenticate(self) -> Optional[str]:
        """
        Authenticate with Pear Protocol and get access token.
        
        Returns:
            Access token string if successful, None otherwise
        """
        if not self.private_key or not self.account:
            logger.error("No private key configured")
            return None
        
        logger.info(f"🔐 Authenticating as {self.address}")
        
        try:
            # Step 1: Get EIP-712 message
            logger.info("Step 1: Getting EIP-712 message...")
            msg_response = requests.get(
                f"{self.api_url}/auth/eip712-message",
                params={"address": self.address, "clientId": self.client_id},
                timeout=30
            )
            msg_response.raise_for_status()
            eip_data = msg_response.json()
            
            logger.debug(f"EIP-712 data: {json.dumps(eip_data, indent=2)}")
            
            # Step 2: Sign the message using EIP-712
            logger.info("Step 2: Signing message...")
            
            # Prepare typed data for signing
            domain = eip_data.get("domain", {})
            types = eip_data.get("types", {})
            message = eip_data.get("message", {})
            
            # Remove EIP712Domain from types if present (handled separately)
            if "EIP712Domain" in types:
                del types["EIP712Domain"]
            
            # Get primary type
            primary_type = eip_data.get("primaryType", "Message")
            
            # Create the typed data structure
            typed_data = {
                "types": {
                    "EIP712Domain": [
                        {"name": "name", "type": "string"},
                        {"name": "version", "type": "string"},
                        {"name": "chainId", "type": "uint256"},
                    ],
                    **types
                },
                "primaryType": primary_type,
                "domain": domain,
                "message": message
            }
            
            # Sign
            signed = self.account.sign_typed_data(
                domain_data=domain,
                message_types=types,
                message_data=message
            )
            signature = '0x' + signed.signature.hex()  # Add 0x prefix
            
            logger.info("Step 3: Logging in...")
            
            # Step 3: Login with signature
            login_response = requests.post(
                f"{self.api_url}/auth/login",
                json={
                    "method": "eip712",
                    "address": self.address,
                    "clientId": self.client_id,
                    "details": {
                        "signature": signature,
                        "timestamp": message.get("timestamp")
                    }
                },
                timeout=30
            )
            login_response.raise_for_status()
            
            result = login_response.json()
            access_token = result.get("accessToken")
            
            if access_token:
                logger.info("✅ Authentication successful!")
                logger.info(f"Token preview: {access_token[:50]}...")
                return access_token
            else:
                logger.error("No access token in response")
                return None
                
        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP error: {e}")
            if e.response:
                logger.error(f"Response: {e.response.text}")
                try:
                    logger.error(f"JSON: {e.response.json()}")
                except:
                    pass
            return None
        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            return None
    
    def save_token(self, token: str, filepath: Optional[str] = None):
        """
        Save access token to file.
        
        Args:
            token: Access token to save
            filepath: Path to save file (default: .pear_token)
        """
        filepath = filepath or str(Path(__file__).parent / ".pear_token")
        
        with open(filepath, 'w') as f:
            f.write(token)
        
        logger.info(f"Token saved to: {filepath}")
    
    def load_token(self, filepath: Optional[str] = None) -> Optional[str]:
        """
        Load access token from file.
        
        Args:
            filepath: Path to token file (default: .pear_token)
            
        Returns:
            Token string if exists, None otherwise
        """
        filepath = filepath or str(Path(__file__).parent / ".pear_token")
        
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                return f.read().strip()
        return None


def get_access_token(save: bool = True) -> Optional[str]:
    """
    Get a Pear Protocol access token.
    
    First tries to load from file, then authenticates if needed.
    
    Args:
        save: Whether to save new token to file
        
    Returns:
        Access token string
    """
    auth = PearAuthenticator()
    
    # Try loading existing token
    token = auth.load_token()
    if token:
        logger.info("Loaded existing token from file")
        return token
    
    # Authenticate
    token = auth.authenticate()
    
    if token and save:
        auth.save_token(token)
    
    return token


# =============================================================================
# MAIN - Test Authentication
# =============================================================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("PEAR PROTOCOL AUTHENTICATION")
    print("="*60)
    
    auth = PearAuthenticator()
    
    print(f"\n📋 Configuration:")
    print(f"  API URL: {auth.api_url}")
    print(f"  Client ID: {auth.client_id}")
    print(f"  Wallet: {auth.address}")
    
    print(f"\n🔐 Attempting authentication...")
    token = auth.authenticate()
    
    if token:
        print(f"\n✅ SUCCESS!")
        print(f"Access Token: {token[:80]}...")
        
        # Save token
        auth.save_token(token)
        print(f"\n💾 Token saved to .pear_token")
        
        # Update .env hint
        print(f"\n📝 Add this to your .env file:")
        print(f"PEAR_ACCESS_TOKEN={token}")
    else:
        print(f"\n❌ Authentication failed")
