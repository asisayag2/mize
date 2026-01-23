import crypto from 'crypto';

/**
 * Browser signals sent from the client for fingerprinting
 */
export interface FingerprintSignals {
  userAgent: string;
  platform: string;
  language: string;
  timezoneOffset: number;
  screenWidth: number;
  screenHeight: number;
}

/**
 * Normalize and hash fingerprint signals
 * 
 * Normalizes the browser signals to reduce variance from minor differences,
 * then hashes them with SHA-256 for privacy (we never store raw signals).
 */
export function hashFingerprint(signals: FingerprintSignals): string {
  // Normalize values to reduce variance
  const normalized = {
    userAgent: signals.userAgent?.toLowerCase().trim() || '',
    platform: signals.platform?.toLowerCase().trim() || '',
    language: signals.language?.toLowerCase().split('-')[0] || '', // e.g., 'en-US' -> 'en'
    timezoneOffset: signals.timezoneOffset || 0,
    // Round screen size to nearest 100 to reduce variance
    screenWidth: Math.round((signals.screenWidth || 0) / 100) * 100,
    screenHeight: Math.round((signals.screenHeight || 0) / 100) * 100,
  };

  // Create deterministic string from normalized values
  const fingerprintString = JSON.stringify(normalized, Object.keys(normalized).sort());

  // Hash with SHA-256
  return crypto.createHash('sha256').update(fingerprintString).digest('hex');
}

/**
 * Validate fingerprint signals structure
 */
export function validateFingerprintSignals(signals: unknown): signals is FingerprintSignals {
  if (!signals || typeof signals !== 'object') {
    return false;
  }

  const s = signals as Record<string, unknown>;
  
  return (
    typeof s.userAgent === 'string' &&
    typeof s.platform === 'string' &&
    typeof s.language === 'string' &&
    typeof s.timezoneOffset === 'number' &&
    typeof s.screenWidth === 'number' &&
    typeof s.screenHeight === 'number'
  );
}

