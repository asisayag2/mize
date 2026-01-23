import { describe, it, expect } from 'vitest';
import {
  hashFingerprint,
  validateFingerprintSignals,
  FingerprintSignals,
} from './fingerprint.js';

describe('Fingerprint Service', () => {
  const validSignals: FingerprintSignals = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    platform: 'Win32',
    language: 'he-IL',
    timezoneOffset: -120,
    screenWidth: 1920,
    screenHeight: 1080,
  };

  describe('validateFingerprintSignals', () => {
    it('should return true for valid signals', () => {
      expect(validateFingerprintSignals(validSignals)).toBe(true);
    });

    it('should return false for null', () => {
      expect(validateFingerprintSignals(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(validateFingerprintSignals(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(validateFingerprintSignals('string')).toBe(false);
      expect(validateFingerprintSignals(123)).toBe(false);
    });

    it('should return false when userAgent is missing', () => {
      const { userAgent, ...missing } = validSignals;
      expect(validateFingerprintSignals(missing)).toBe(false);
    });

    it('should return false when platform is missing', () => {
      const { platform, ...missing } = validSignals;
      expect(validateFingerprintSignals(missing)).toBe(false);
    });

    it('should return false when language is missing', () => {
      const { language, ...missing } = validSignals;
      expect(validateFingerprintSignals(missing)).toBe(false);
    });

    it('should return false when timezoneOffset is not a number', () => {
      const invalid = { ...validSignals, timezoneOffset: 'string' };
      expect(validateFingerprintSignals(invalid)).toBe(false);
    });

    it('should return false when screenWidth is not a number', () => {
      const invalid = { ...validSignals, screenWidth: 'string' };
      expect(validateFingerprintSignals(invalid)).toBe(false);
    });

    it('should return false when screenHeight is not a number', () => {
      const invalid = { ...validSignals, screenHeight: 'string' };
      expect(validateFingerprintSignals(invalid)).toBe(false);
    });
  });

  describe('hashFingerprint', () => {
    it('should return a 64-character hex string (SHA-256)', () => {
      const hash = hashFingerprint(validSignals);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should return consistent hashes for same input', () => {
      const hash1 = hashFingerprint(validSignals);
      const hash2 = hashFingerprint(validSignals);
      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different inputs', () => {
      const hash1 = hashFingerprint(validSignals);
      const hash2 = hashFingerprint({ ...validSignals, platform: 'MacIntel' });
      expect(hash1).not.toBe(hash2);
    });

    it('should normalize case differences', () => {
      const hash1 = hashFingerprint(validSignals);
      const hash2 = hashFingerprint({
        ...validSignals,
        userAgent: validSignals.userAgent.toUpperCase(),
        platform: validSignals.platform.toUpperCase(),
      });
      expect(hash1).toBe(hash2);
    });

    it('should normalize whitespace', () => {
      const hash1 = hashFingerprint(validSignals);
      const hash2 = hashFingerprint({
        ...validSignals,
        userAgent: `  ${validSignals.userAgent}  `,
        platform: `  ${validSignals.platform}  `,
      });
      expect(hash1).toBe(hash2);
    });

    it('should normalize language (take first part only)', () => {
      const hash1 = hashFingerprint({ ...validSignals, language: 'he-IL' });
      const hash2 = hashFingerprint({ ...validSignals, language: 'he-US' });
      expect(hash1).toBe(hash2);
    });

    it('should round screen dimensions to nearest 100', () => {
      // 1920 rounds to 1900, 1890 also rounds to 1900
      // 1080 rounds to 1100, 1070 also rounds to 1100
      const hash1 = hashFingerprint({
        ...validSignals,
        screenWidth: 1920,
        screenHeight: 1080,
      });
      const hash2 = hashFingerprint({
        ...validSignals,
        screenWidth: 1890,
        screenHeight: 1070,
      });
      expect(hash1).toBe(hash2);
    });

    it('should differentiate significantly different screen sizes', () => {
      const hash1 = hashFingerprint({
        ...validSignals,
        screenWidth: 1920,
        screenHeight: 1080,
      });
      const hash2 = hashFingerprint({
        ...validSignals,
        screenWidth: 2560,
        screenHeight: 1440,
      });
      expect(hash1).not.toBe(hash2);
    });

    it('should handle missing/undefined values gracefully', () => {
      const hash = hashFingerprint({
        userAgent: '',
        platform: '',
        language: '',
        timezoneOffset: 0,
        screenWidth: 0,
        screenHeight: 0,
      });
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});

