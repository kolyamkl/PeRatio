/**
 * Basket Trade Page
 * Build and execute custom basket trades with user's connected wallet
 */

import { useState, useEffect } from 'react';
import { useWallet } from '../lib/walletProvider';
import { executeBasketTrade, AssetWeight } from '../lib/basketApi';
import { Plus, Trash2, TrendingUp, TrendingDown, Zap } from 'lucide-react';

interface BasketAsset {
  id: string;
  asset: string;
  weight: number;
}

export function BasketTradePage() {
  const wallet = useWallet();
  
  const [longAssets, setLongAssets] = useState<BasketAsset[]>([
    { id: '1', asset: 'BTC', weight: 1.0 }
  ]);
  const [shortAssets, setShortAssets] = useState<BasketAsset[]>([]);
  
  const [usdValue, setUsdValue] = useState<number>(10);
  const [leverage, setLeverage] = useState<number>(1);
  const [slippage, setSlippage] = useState<number>(0.08);
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Normalize weights to sum to 1.0
  const normalizeWeights = (assets: BasketAsset[]): BasketAsset[] => {
    const total = assets.reduce((sum, a) => sum + a.weight, 0);
    if (total === 0) return assets;
    return assets.map(a => ({ ...a, weight: a.weight / total }));
  };

  // Add asset
  const addAsset = (type: 'long' | 'short') => {
    const newAsset: BasketAsset = {
      id: Date.now().toString(),
      asset: 'ETH',
      weight: 1.0,
    };
    
    if (type === 'long') {
      setLongAssets([...longAssets, newAsset]);
    } else {
      setShortAssets([...shortAssets, newAsset]);
    }
  };

  // Remove asset
  const removeAsset = (type: 'long' | 'short', id: string) => {
    if (type === 'long') {
      setLongAssets(longAssets.filter(a => a.id !== id));
    } else {
      setShortAssets(shortAssets.filter(a => a.id !== id));
    }
  };

  // Update asset
  const updateAsset = (type: 'long' | 'short', id: string, field: 'asset' | 'weight', value: string | number) => {
    const updateFn = (assets: BasketAsset[]) =>
      assets.map(a => a.id === id ? { ...a, [field]: value } : a);
    
    if (type === 'long') {
      setLongAssets(updateFn(longAssets));
    } else {
      setShortAssets(updateFn(shortAssets));
    }
  };

  // Execute trade
  const handleExecute = async () => {
    if (!wallet.pearAccessToken) {
      setError('Please authenticate with Pear Protocol first');
      return;
    }

    if (longAssets.length === 0 && shortAssets.length === 0) {
      setError('Add at least one asset to the basket');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setSuccess(null);

    try {
      // Normalize weights
      const normalizedLong = normalizeWeights(longAssets);
      const normalizedShort = normalizeWeights(shortAssets);

      const result = await executeBasketTrade(wallet.pearAccessToken, {
        longAssets: normalizedLong.map(a => ({ asset: a.asset.toUpperCase(), weight: a.weight })),
        shortAssets: normalizedShort.map(a => ({ asset: a.asset.toUpperCase(), weight: a.weight })),
        usdValue,
        leverage,
        slippage,
      });

      if (result.success) {
        setSuccess('✅ Basket trade executed successfully!');
        await wallet.refreshPositions();
      } else {
        setError(result.error || 'Trade execution failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsExecuting(false);
    }
  };

  // Calculate total weights
  const longTotal = longAssets.reduce((sum, a) => sum + a.weight, 0);
  const shortTotal = shortAssets.reduce((sum, a) => sum + a.weight, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">🧺 Basket Trade Builder</h1>
          <p className="text-slate-400">Create custom multi-asset positions</p>
        </div>

        {/* Wallet Status */}
        {!wallet.isConnected && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <p className="text-yellow-400">⚠️ Please connect your wallet first</p>
          </div>
        )}

        {wallet.isConnected && !wallet.isPearAuthenticated && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <p className="text-blue-400 mb-3">🔐 Authenticate with Pear Protocol to trade</p>
            <button
              onClick={wallet.authenticatePear}
              disabled={wallet.isPearAuthenticating}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {wallet.isPearAuthenticating ? 'Authenticating...' : 'Authenticate'}
            </button>
          </div>
        )}

        {/* Long Assets */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 mb-4 border border-green-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <h2 className="text-xl font-bold text-green-400">Long Positions</h2>
            </div>
            <button
              onClick={() => addAsset('long')}
              className="bg-green-600 hover:bg-green-700 p-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {longAssets.map((asset) => (
            <div key={asset.id} className="flex gap-3 mb-3">
              <input
                type="text"
                value={asset.asset}
                onChange={(e) => updateAsset('long', asset.id, 'asset', e.target.value.toUpperCase())}
                placeholder="BTC"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500"
              />
              <input
                type="number"
                value={asset.weight}
                onChange={(e) => updateAsset('long', asset.id, 'weight', parseFloat(e.target.value) || 0)}
                step="0.1"
                min="0"
                placeholder="Weight"
                className="w-24 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500"
              />
              <button
                onClick={() => removeAsset('long', asset.id)}
                className="bg-red-600 hover:bg-red-700 p-2 rounded-lg transition-colors"
                disabled={longAssets.length === 1 && shortAssets.length === 0}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="text-sm text-slate-400 mt-2">
            Total weight: {longTotal.toFixed(2)} (will be normalized to 1.0)
          </div>
        </div>

        {/* Short Assets */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 mb-4 border border-red-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              <h2 className="text-xl font-bold text-red-400">Short Positions</h2>
            </div>
            <button
              onClick={() => addAsset('short')}
              className="bg-red-600 hover:bg-red-700 p-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {shortAssets.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No short positions (optional)</p>
          ) : (
            <>
              {shortAssets.map((asset) => (
                <div key={asset.id} className="flex gap-3 mb-3">
                  <input
                    type="text"
                    value={asset.asset}
                    onChange={(e) => updateAsset('short', asset.id, 'asset', e.target.value.toUpperCase())}
                    placeholder="ETH"
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-red-500"
                  />
                  <input
                    type="number"
                    value={asset.weight}
                    onChange={(e) => updateAsset('short', asset.id, 'weight', parseFloat(e.target.value) || 0)}
                    step="0.1"
                    min="0"
                    placeholder="Weight"
                    className="w-24 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-red-500"
                  />
                  <button
                    onClick={() => removeAsset('short', asset.id)}
                    className="bg-red-600 hover:bg-red-700 p-2 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <div className="text-sm text-slate-400 mt-2">
                Total weight: {shortTotal.toFixed(2)} (will be normalized to 1.0)
              </div>
            </>
          )}
        </div>

        {/* Trade Parameters */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 mb-4 border border-slate-700">
          <h2 className="text-xl font-bold mb-4">Trade Parameters</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">USD Value</label>
              <input
                type="number"
                value={usdValue}
                onChange={(e) => setUsdValue(parseFloat(e.target.value) || 10)}
                min="10"
                step="10"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">Minimum: $10</p>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Leverage: {leverage}x</label>
              <input
                type="range"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                min="1"
                max="100"
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1x</span>
                <span>100x</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Slippage: {(slippage * 100).toFixed(1)}%</label>
              <input
                type="range"
                value={slippage}
                onChange={(e) => setSlippage(parseFloat(e.target.value))}
                min="0.01"
                max="0.2"
                step="0.01"
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1%</span>
                <span>20%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
            <p className="text-green-400">{success}</p>
          </div>
        )}

        {/* Execute Button */}
        <button
          onClick={handleExecute}
          disabled={!wallet.isPearAuthenticated || isExecuting || (longAssets.length === 0 && shortAssets.length === 0)}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
        >
          <Zap className="w-5 h-5" />
          {isExecuting ? 'Executing Trade...' : 'Execute Basket Trade'}
        </button>

        {/* Info */}
        <div className="mt-6 text-center text-sm text-slate-500">
          <p>Weights will be automatically normalized</p>
          <p>Trade executes on Pear Protocol via Hyperliquid</p>
        </div>
      </div>
    </div>
  );
}
