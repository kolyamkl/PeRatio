/**
 * WalletConnect Configuration for Telegram Mini App
 * ==================================================
 * Configures Web3Modal/WalletConnect v2 with proper settings
 * for Telegram mini app environment
 */

import { http, createConfig } from 'wagmi'
import { arbitrum } from 'wagmi/chains'
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors'

/**
 * WalletConnect Project ID
 * Get yours at: https://cloud.walletconnect.com/
 */
export const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'bab64adddf95ea9516643879ac4db489'

/**
 * App Metadata
 * This appears in wallet connection prompts
 */
export const APP_METADATA = {
  name: 'PeRatio',
  description: 'AI-Powered Pair Trading on Hyperliquid',
  url: 'https://peratio.app',
  icons: ['https://peratio.app/icon.png']
}

/**
 * Supported Chains
 * Currently using Arbitrum for USDC trading
 */
export const SUPPORTED_CHAINS = [arbitrum]

/**
 * Wagmi Configuration
 * Manual config for Web3Modal v5
 */
export const wagmiConfig = createConfig({
  chains: [arbitrum],
  transports: {
    [arbitrum.id]: http(),
  },
  connectors: [
    walletConnect({ 
      projectId: WALLETCONNECT_PROJECT_ID,
      metadata: APP_METADATA,
      showQrModal: false, // We handle QR modal ourselves
    }),
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: APP_METADATA.name,
      appLogoUrl: APP_METADATA.icons[0],
    }),
  ],
})

/**
 * Web3Modal Theme Configuration
 * Customize to match your Telegram mini app design
 */
export const WEB3_MODAL_THEME = {
  themeMode: 'dark' as const,
  themeVariables: {
    '--w3m-accent': '#00D9FF', // Your accent color
    '--w3m-border-radius-master': '12px',
  }
}

/**
 * Mobile Wallet Deep Link Configuration
 * Maps wallet types to their deep link schemes
 */
export const WALLET_DEEP_LINKS = {
  metamask: {
    scheme: 'metamask://',
    universal: 'https://metamask.app.link/',
    wcParam: 'wc?uri='
  },
  trust: {
    scheme: 'trust://',
    universal: 'https://link.trustwallet.com/',
    wcParam: 'wc?uri='
  },
  rainbow: {
    scheme: 'rainbow://',
    universal: 'https://rainbow.me/',
    wcParam: 'wc?uri='
  },
  coinbase: {
    scheme: 'cbwallet://',
    universal: 'https://go.cb-w.com/',
    wcParam: 'wsegue?uri='
  },
  phantom: {
    scheme: 'phantom://',
    universal: 'https://phantom.app/',
    wcParam: 'wc?uri='
  }
} as const

export type WalletType = keyof typeof WALLET_DEEP_LINKS

/**
 * Generate deep link for mobile wallet
 * @param walletType - The wallet to open
 * @param wcUri - WalletConnect URI
 * @param useUniversal - Use universal link instead of scheme (better for iOS)
 */
export function generateWalletDeepLink(
  walletType: WalletType,
  wcUri: string,
  useUniversal = true
): string {
  const wallet = WALLET_DEEP_LINKS[walletType]
  const encodedUri = encodeURIComponent(wcUri)
  
  if (useUniversal) {
    // Universal links work better on iOS (no "Open in..." prompt)
    return `${wallet.universal}${wallet.wcParam}${encodedUri}`
  } else {
    // Deep link schemes (direct app opening)
    return `${wallet.scheme}${wallet.wcParam}${encodedUri}`
  }
}

/**
 * Open wallet app with WalletConnect URI
 * Handles the redirect to mobile wallet
 */
export function openWalletApp(walletType: WalletType, wcUri: string): void {
  const deepLink = generateWalletDeepLink(walletType, wcUri)
  
  console.log(`[WalletConnect] Opening ${walletType} with deep link`)
  
  // Use window.location for better compatibility in Telegram
  window.location.href = deepLink
  
  // Fallback: try window.open if location.href doesn't work
  setTimeout(() => {
    try {
      window.open(deepLink, '_blank')
    } catch (error) {
      console.error('[WalletConnect] Failed to open wallet:', error)
    }
  }, 500)
}

/**
 * Check if wallet app is likely installed
 * Note: This is a best-effort check, not 100% reliable
 */
export function isWalletLikelyInstalled(_walletType: WalletType): boolean {
  // On mobile, we can't reliably detect if an app is installed
  // This is a placeholder for future enhancement
  // You could use custom URL scheme detection or other methods
  return true // Assume installed for now
}
