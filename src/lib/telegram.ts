// Telegram WebApp SDK helper
// Provides safe access to Telegram Mini App features

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  close: () => void
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  themeParams: ThemeParams
  colorScheme: 'light' | 'dark'
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
  MainButton: {
    text: string
    color: string
    textColor: string
    isVisible: boolean
    isActive: boolean
    isProgressVisible: boolean
    setText: (text: string) => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
    show: () => void
    hide: () => void
    enable: () => void
    disable: () => void
    showProgress: (leaveActive?: boolean) => void
    hideProgress: () => void
  }
  BackButton: {
    isVisible: boolean
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
    show: () => void
    hide: () => void
  }
  safeAreaInset: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

interface ThemeParams {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
  header_bg_color?: string
  accent_text_color?: string
  section_bg_color?: string
  section_header_text_color?: string
  subtitle_text_color?: string
  destructive_text_color?: string
}

/**
 * Get the Telegram WebApp instance if available
 */
export function getTelegram(): TelegramWebApp | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp
  }
  return null
}

/**
 * Initialize Telegram WebApp
 * Call this on app load
 */
export function initTelegram(): void {
  const tg = getTelegram()
  if (tg) {
    // Signal that the app is ready
    tg.ready()
    
    // Expand to full height if possible
    if (typeof tg.expand === 'function') {
      tg.expand()
    }
  }
}

/**
 * Check if we're actually running inside Telegram (not just SDK loaded)
 */
export function isRunningInTelegram(): boolean {
  const tg = getTelegram()
  if (!tg) return false
  
  // Check for indicators that we're actually in Telegram:
  // - initData is populated when inside Telegram (empty string when not)
  // - platform is a specific value (not "unknown") when in Telegram
  const tgAny = tg as unknown as { initData?: string; platform?: string }
  const hasInitData = !!(tgAny.initData && tgAny.initData.length > 0)
  const hasValidPlatform = !!(tgAny.platform && tgAny.platform !== 'unknown')
  
  return hasInitData || hasValidPlatform
}

/**
 * Get theme parameters with fallback values
 */
export function getThemeParams(): {
  bgColor: string
  textColor: string
  hintColor: string
  buttonColor: string
  buttonTextColor: string
  secondaryBgColor: string
  accentColor: string
  isLight: boolean
} {
  const tg = getTelegram()
  const params = tg?.themeParams
  
  // Only use Telegram's colorScheme if we're actually in Telegram
  // Otherwise default to dark mode
  const inTelegram = isRunningInTelegram()
  const colorScheme = inTelegram ? (tg?.colorScheme || 'dark') : 'dark'
  const isLight = colorScheme === 'light'
  
  // Default dark theme values
  const defaults = {
    bgColor: isLight ? '#ffffff' : '#0f0f0f',
    textColor: isLight ? '#18181b' : '#ffffff',
    hintColor: isLight ? '#71717a' : '#a1a1aa',
    buttonColor: '#3b82f6',
    buttonTextColor: '#ffffff',
    secondaryBgColor: isLight ? '#f4f4f5' : '#1a1a1a',
    accentColor: '#3b82f6',
    isLight,
  }
  
  if (!params) {
    return defaults
  }
  
  return {
    bgColor: params.bg_color || defaults.bgColor,
    textColor: params.text_color || defaults.textColor,
    hintColor: params.hint_color || defaults.hintColor,
    buttonColor: params.button_color || defaults.buttonColor,
    buttonTextColor: params.button_text_color || defaults.buttonTextColor,
    secondaryBgColor: params.secondary_bg_color || defaults.secondaryBgColor,
    accentColor: params.accent_text_color || defaults.accentColor,
    isLight,
  }
}

/**
 * Get safe area insets for notch/home indicator
 */
export function getSafeAreaInsets(): {
  top: number
  bottom: number
  left: number
  right: number
} {
  const tg = getTelegram()
  
  if (tg?.safeAreaInset) {
    return tg.safeAreaInset
  }
  
  // Fallback values
  return {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }
}

/**
 * Trigger haptic feedback
 */
export function hapticFeedback(
  type: 'impact' | 'notification' | 'selection',
  style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'error' | 'success' | 'warning'
): void {
  const tg = getTelegram()
  
  if (!tg?.HapticFeedback) {
    return
  }
  
  try {
    switch (type) {
      case 'impact':
        tg.HapticFeedback.impactOccurred(
          (style as 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') || 'medium'
        )
        break
      case 'notification':
        tg.HapticFeedback.notificationOccurred(
          (style as 'error' | 'success' | 'warning') || 'success'
        )
        break
      case 'selection':
        tg.HapticFeedback.selectionChanged()
        break
    }
  } catch {
    // Silently fail if haptic not available
  }
}

/**
 * Get viewport dimensions
 */
export function getViewport(): {
  height: number
  stableHeight: number
  isExpanded: boolean
} {
  const tg = getTelegram()
  
  return {
    height: tg?.viewportHeight || window.innerHeight,
    stableHeight: tg?.viewportStableHeight || window.innerHeight,
    isExpanded: tg?.isExpanded || false,
  }
}

/**
 * Get Telegram user info from init data
 */
export function getTelegramUserInfo(): {
  userId: string | null
  chatId: string | null
  username: string | null
  firstName: string | null
  lastName: string | null
} {
  const tg = getTelegram() as unknown as { 
    initDataUnsafe?: { 
      user?: { 
        id?: number
        username?: string
        first_name?: string
        last_name?: string
      }
      chat?: {
        id?: number
      }
      start_param?: string
    }
  }
  
  const user = tg?.initDataUnsafe?.user
  const chat = tg?.initDataUnsafe?.chat
  
  // For development/testing outside Telegram, check URL params
  if (!user?.id) {
    const urlParams = new URLSearchParams(window.location.search)
    const testUserId = urlParams.get('user_id') || urlParams.get('userId')
    const testChatId = urlParams.get('chat_id') || urlParams.get('chatId')
    
    if (testUserId) {
      return {
        userId: testUserId,
        chatId: testChatId || testUserId,
        username: urlParams.get('username') || 'test_user',
        firstName: urlParams.get('first_name') || 'Test',
        lastName: urlParams.get('last_name') || 'User',
      }
    }
    
    // Return null values when not in Telegram and no test params
    return {
      userId: null,
      chatId: null,
      username: null,
      firstName: null,
      lastName: null,
    }
  }
  
  return {
    userId: user.id?.toString() || null,
    chatId: chat?.id?.toString() || user.id?.toString() || null,
    username: user.username || null,
    firstName: user.first_name || null,
    lastName: user.last_name || null,
  }
}
