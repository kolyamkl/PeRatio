/**
 * Device Detection Utilities for Telegram Mini App
 * =================================================
 * Detects device type (mobile/desktop) and Telegram environment
 * to enable proper WalletConnect flow (deep links vs QR codes)
 */

export interface DeviceInfo {
  isMobile: boolean
  isDesktop: boolean
  isTelegramWebApp: boolean
  isTelegramMobile: boolean
  isTelegramDesktop: boolean
  isIOS: boolean
  isAndroid: boolean
  platform: 'ios' | 'android' | 'desktop' | 'unknown'
}

/**
 * Detect if running on mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  const ua = navigator.userAgent.toLowerCase()
  
  // Check for mobile keywords
  const mobileKeywords = [
    'android',
    'webos',
    'iphone',
    'ipad',
    'ipod',
    'blackberry',
    'windows phone',
    'mobile'
  ]
  
  const hasMobileKeyword = mobileKeywords.some(keyword => ua.includes(keyword))
  
  // Check for touch support (additional indicator)
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  
  // Check screen size (mobile typically < 768px)
  const isSmallScreen = window.innerWidth < 768
  
  return hasMobileKeyword || (hasTouch && isSmallScreen)
}

/**
 * Detect if running inside Telegram Web App
 */
export function isTelegramWebApp(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check for Telegram WebApp object
  return !!(window as any).Telegram?.WebApp
}

/**
 * Detect iOS device
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  const ua = navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(ua)
}

/**
 * Detect Android device
 */
export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  const ua = navigator.userAgent.toLowerCase()
  return /android/.test(ua)
}

/**
 * Detect if running in Telegram mobile app (iOS or Android)
 */
export function isTelegramMobile(): boolean {
  if (!isTelegramWebApp()) return false
  return isMobileDevice()
}

/**
 * Detect if running in Telegram Desktop
 */
export function isTelegramDesktop(): boolean {
  if (!isTelegramWebApp()) return false
  return !isMobileDevice()
}

/**
 * Get platform type
 */
export function getPlatform(): 'ios' | 'android' | 'desktop' | 'unknown' {
  if (isIOSDevice()) return 'ios'
  if (isAndroidDevice()) return 'android'
  if (!isMobileDevice()) return 'desktop'
  return 'unknown'
}

/**
 * Get comprehensive device information
 */
export function getDeviceInfo(): DeviceInfo {
  const isMobile = isMobileDevice()
  const isTgWebApp = isTelegramWebApp()
  const isIOS = isIOSDevice()
  const isAndroid = isAndroidDevice()
  
  return {
    isMobile,
    isDesktop: !isMobile,
    isTelegramWebApp: isTgWebApp,
    isTelegramMobile: isTgWebApp && isMobile,
    isTelegramDesktop: isTgWebApp && !isMobile,
    isIOS,
    isAndroid,
    platform: getPlatform()
  }
}

/**
 * Log device info for debugging
 */
export function logDeviceInfo(): void {
  const info = getDeviceInfo()
  console.log('🔍 [Device Detection]', {
    userAgent: navigator.userAgent,
    ...info,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    touchPoints: navigator.maxTouchPoints
  })
}
