"""Send LLM signal to PEAR Protocol."""
import json
import sys
import glob
from pear_api_client import PearApiClient
from pear_auth import get_access_token

# Get the latest signal
signals = sorted(glob.glob('pair_signal_*.json'), reverse=True)
if not signals:
    print('No signals found')
    sys.exit(1)

print(f'Loading signal: {signals[0]}')
with open(signals[0]) as f:
    pair = json.load(f)

print(f"Pair ID: {pair['pair_id']}")
print(f"Long: {[a['coin'] for a in pair['long']['assets']]}")
print(f"Short: {[a['coin'] for a in pair['short']['assets']]}")
print()

# Authenticate
print('Authenticating...')
token = get_access_token(save=False)
if not token:
    print('Failed to get access token')
    sys.exit(1)
print('Got access token')

# Execute trade
client = PearApiClient()
client.set_access_token(token)

# Get execution params
exec_params = pair.get('execution', {})
take_profit = exec_params.get('take_profit_percent', 20.0)
stop_loss = exec_params.get('stop_loss_percent', 8.0)

print()
print('Sending to PEAR Protocol...')
result = client.create_pair_trade(
    long_assets=pair['long']['assets'],
    short_assets=pair['short']['assets'],
    size_usd=25.0,
    leverage=2,
    execution_type='MARKET',
    take_profit_percent=take_profit,
    stop_loss_percent=stop_loss,
    slippage=0.08
)

print()
print('=' * 50)
print('RESULT')
print('=' * 50)
print(json.dumps(result, indent=2))

if result.get('success'):
    print()
    print('✅ Trade executed successfully!')
else:
    print()
    print(f"❌ Trade failed: {result.get('error', 'Unknown error')}")
