"""
Pear Protocol SDK Bridge
Bridges Python backend to TypeScript Pear SDK for basket trading
"""

import json
import subprocess
import logging
from typing import Dict, List, Optional, Any
from pathlib import Path

logger = logging.getLogger(__name__)

# Path to the SDK
SDK_PATH = Path(__file__).parent / "pear-sdk"
SDK_SCRIPT = SDK_PATH / "src" / "sdk" / "example-usage.ts"


class PearSDKBridge:
    """Bridge to execute Pear Protocol SDK operations from Python"""
    
    def __init__(self):
        self.sdk_path = SDK_PATH
    
    def _run_tsx_command(self, script_content: str) -> Dict[str, Any]:
        """Execute TypeScript code via tsx and return JSON result"""
        try:
            # Create temporary script
            temp_script = self.sdk_path / "temp_script.ts"
            temp_script.write_text(script_content)
            
            # Run with tsx
            result = subprocess.run(
                ["npx", "tsx", str(temp_script)],
                cwd=str(self.sdk_path),
                capture_output=True,
                text=True,
                timeout=30
            )
            
            # Clean up
            temp_script.unlink(missing_ok=True)
            
            if result.returncode != 0:
                logger.error(f"SDK execution failed: {result.stderr}")
                return {"success": False, "error": result.stderr}
            
            # Parse JSON output from last line
            output_lines = result.stdout.strip().split('\n')
            for line in reversed(output_lines):
                try:
                    return json.loads(line)
                except json.JSONDecodeError:
                    continue
            
            return {"success": False, "error": "No JSON output found"}
            
        except Exception as e:
            logger.error(f"SDK bridge error: {e}")
            return {"success": False, "error": str(e)}
    
    # Authentication is now handled entirely in frontend
    # Frontend signs EIP-712 message and gets access token directly
    # Backend only receives and uses the access token
    
    def execute_basket_trade(
        self,
        access_token: str,
        long_assets: List[Dict[str, Any]],
        short_assets: List[Dict[str, Any]],
        usd_value: float,
        leverage: int = 1,
        slippage: float = 0.08
    ) -> Dict[str, Any]:
        """Execute a basket trade using user's access token"""
        
        long_json = json.dumps(long_assets)
        short_json = json.dumps(short_assets)
        
        script = f"""
import {{ createPearSDK }} from './src/sdk/index.js';
import {{ config }} from 'dotenv';
config();

async function main() {{
    try {{
        const sdk = createPearSDK({{
            apiUrl: process.env.API_URL,
            clientId: process.env.CLIENT_ID || 'APITRADER',
        }});
        
        sdk.setAccessToken('{access_token}');
        
        const result = await sdk.executeBasketTrade({{
            executionType: 'MARKET',
            slippage: {slippage},
            leverage: {leverage},
            usdValue: {usd_value},
            longAssets: {long_json},
            shortAssets: {short_json}
        }});
        
        console.log(JSON.stringify({{
            success: true,
            result: result
        }}));
    }} catch (error) {{
        console.log(JSON.stringify({{
            success: false,
            error: error.message,
            details: error.response?.data
        }}));
    }}
}}

main();
"""
        return self._run_tsx_command(script)
    
    def execute_agent_signal(
        self,
        access_token: str,
        signal: Dict[str, Any],
        override_usd_value: Optional[float] = None,
        override_leverage: Optional[int] = None
    ) -> Dict[str, Any]:
        """Execute an Agent Pear signal"""
        
        signal_json = json.dumps(signal)
        options = {}
        if override_usd_value:
            options['overrideUsdValue'] = override_usd_value
        if override_leverage:
            options['overrideLeverage'] = override_leverage
        options_json = json.dumps(options)
        
        script = f"""
import {{ createPearSDK }} from './src/sdk/index.js';
import {{ config }} from 'dotenv';
config();

async function main() {{
    try {{
        const sdk = createPearSDK({{
            apiUrl: process.env.API_URL,
            clientId: process.env.CLIENT_ID || 'APITRADER',
        }});
        
        sdk.setAccessToken('{access_token}');
        
        const signal = {signal_json};
        const options = {options_json};
        
        const result = await sdk.executeAgentSignal(signal, options);
        
        console.log(JSON.stringify({{
            success: true,
            result: result
        }}));
    }} catch (error) {{
        console.log(JSON.stringify({{
            success: false,
            error: error.message,
            details: error.response?.data
        }}));
    }}
}}

main();
"""
        return self._run_tsx_command(script)
    
    def get_open_positions(self, access_token: str) -> Dict[str, Any]:
        """Get user's open positions"""
        script = f"""
import {{ createPearSDK }} from './src/sdk/index.js';
import {{ config }} from 'dotenv';
config();

async function main() {{
    try {{
        const sdk = createPearSDK({{
            apiUrl: process.env.API_URL,
            clientId: process.env.CLIENT_ID || 'APITRADER',
        }});
        
        sdk.setAccessToken('{access_token}');
        
        const positions = await sdk.getOpenPositions();
        
        console.log(JSON.stringify({{
            success: true,
            positions: positions
        }}));
    }} catch (error) {{
        console.log(JSON.stringify({{
            success: false,
            error: error.message
        }}));
    }}
}}

main();
"""
        return self._run_tsx_command(script)
    
    def close_position(
        self,
        access_token: str,
        position_id: str,
        percentage: float = 1.0
    ) -> Dict[str, Any]:
        """Close a position"""
        script = f"""
import {{ createPearSDK }} from './src/sdk/index.js';
import {{ config }} from 'dotenv';
config();

async function main() {{
    try {{
        const sdk = createPearSDK({{
            apiUrl: process.env.API_URL,
            clientId: process.env.CLIENT_ID || 'APITRADER',
        }});
        
        sdk.setAccessToken('{access_token}');
        
        const result = await sdk.closePosition({{
            positionId: '{position_id}',
            percentage: {percentage}
        }});
        
        console.log(JSON.stringify({{
            success: true,
            result: result
        }}));
    }} catch (error) {{
        console.log(JSON.stringify({{
            success: false,
            error: error.message
        }}));
    }}
}}

main();
"""
        return self._run_tsx_command(script)
    
    def get_agent_wallet_status(self, access_token: str) -> Dict[str, Any]:
        """Check agent wallet status"""
        script = f"""
import {{ createPearSDK }} from './src/sdk/index.js';
import {{ config }} from 'dotenv';
config();

async function main() {{
    try {{
        const sdk = createPearSDK({{
            apiUrl: process.env.API_URL,
            clientId: process.env.CLIENT_ID || 'APITRADER',
        }});
        
        sdk.setAccessToken('{access_token}');
        
        const wallet = await sdk.getAgentWallet();
        
        console.log(JSON.stringify({{
            success: true,
            agentWallet: wallet
        }}));
    }} catch (error) {{
        console.log(JSON.stringify({{
            success: false,
            error: error.message
        }}));
    }}
}}

main();
"""
        return self._run_tsx_command(script)
    
    def create_agent_wallet(self, access_token: str) -> Dict[str, Any]:
        """Create agent wallet"""
        script = f"""
import {{ createPearSDK }} from './src/sdk/index.js';
import {{ config }} from 'dotenv';
config();

async function main() {{
    try {{
        const sdk = createPearSDK({{
            apiUrl: process.env.API_URL,
            clientId: process.env.CLIENT_ID || 'APITRADER',
        }});
        
        sdk.setAccessToken('{access_token}');
        
        const wallet = await sdk.createAgentWallet();
        
        console.log(JSON.stringify({{
            success: true,
            agentWallet: wallet
        }}));
    }} catch (error) {{
        console.log(JSON.stringify({{
            success: false,
            error: error.message
        }}));
    }}
}}

main();
"""
        return self._run_tsx_command(script)
