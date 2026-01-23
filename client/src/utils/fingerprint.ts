/**
 * Fingerprint signals for anti-cheat
 * 
 * Collects stable browser signals that help identify a device
 * without storing any personally identifiable information.
 */
export interface FingerprintSignals {
  userAgent: string
  platform: string
  language: string
  timezoneOffset: number
  screenWidth: number
  screenHeight: number
}

/**
 * Collect browser fingerprint signals
 * 
 * These signals are sent to the server which hashes them.
 * The raw signals are never stored.
 */
export function getFingerprint(): FingerprintSignals {
  return {
    userAgent: navigator.userAgent || '',
    platform: navigator.platform || '',
    language: navigator.language || '',
    timezoneOffset: new Date().getTimezoneOffset(),
    screenWidth: window.screen.width || 0,
    screenHeight: window.screen.height || 0,
  }
}

