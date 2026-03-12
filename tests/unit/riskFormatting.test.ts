/**
 * Unit tests: formatRiskExposure (cents-string API) — GATEKEEPER PROTOCOL.
 * TDD: API serializes BigInt financial data as string cents; formatter must parse safely and scale correctly.
 */
import { describe, it, expect } from 'vitest';
import { formatRiskExposure, type CurrencyMagnitude } from '@/app/utils/riskFormatting';

describe('formatRiskExposure(centsString, scale)', () => {
  describe('converts cents to dollars correctly', () => {
    it('500_000_000 cents ($5M) formats as 5.0M with AUTO', () => {
      expect(formatRiskExposure('500000000', 'AUTO')).toBe('5.0M');
    });

    it('100_000_000 cents ($1M) formats as 1.0M with AUTO', () => {
      expect(formatRiskExposure('100000000', 'AUTO')).toBe('1.0M');
    });

    it('0 cents formats as 0.0 with AUTO', () => {
      expect(formatRiskExposure('0', 'AUTO')).toBe('0.0');
    });

    it('100 cents ($1) formats as 1.0 with AUTO (no suffix)', () => {
      expect(formatRiskExposure('100', 'AUTO')).toBe('1.0');
    });

    it('50_000_000 cents ($500K) formats as 500.0K with AUTO', () => {
      expect(formatRiskExposure('50000000', 'AUTO')).toBe('500.0K');
    });
  });

  describe('AUTO scaling', () => {
    it('5,000,000 dollars (500_000_000 cents) scales to $5.0M', () => {
      const cents = '500000000'; // $5M
      expect(formatRiskExposure(cents, 'AUTO')).toBe('5.0M');
    });

    it('1,000,000,000 cents ($10M) scales to 10.0M', () => {
      expect(formatRiskExposure('1000000000', 'AUTO')).toBe('10.0M');
    });

    it('1_000_000_000_000 cents ($10B) scales to 10.0B', () => {
      expect(formatRiskExposure('1000000000000', 'AUTO')).toBe('10.0B');
    });
  });

  describe('forced scale K', () => {
    it('5,000,000 dollars (500_000_000 cents) with scale K outputs 5000.0K', () => {
      expect(formatRiskExposure('500000000', 'K')).toBe('5000.0K');
    });

    it('1_000_000 cents ($10K) with scale K outputs 10.0K', () => {
      expect(formatRiskExposure('1000000', 'K')).toBe('10.0K');
    });
  });

  describe('forced scale M, B, T', () => {
    it('500_000_000 cents with scale M outputs 5.0M', () => {
      expect(formatRiskExposure('500000000', 'M')).toBe('5.0M');
    });

    it('1_500_000_000 cents with scale B outputs 1.5B', () => {
      // 150 billion cents = $1.5B
      expect(formatRiskExposure('150000000000', 'B')).toBe('1.5B');
    });

    it('2_000_000_000_000 cents with scale T outputs 2.0T', () => {
      // 2 trillion cents = $20B; 200 trillion cents = $2T
      expect(formatRiskExposure('200000000000000', 'T')).toBe('2.0T');
    });
  });

  describe('string inputs and validation', () => {
    it('accepts numeric string and formats', () => {
      expect(formatRiskExposure('123456789', 'AUTO')).toBe('1.2M');
    });

    it('throws for non-numeric string', () => {
      expect(() => formatRiskExposure('abc', 'AUTO')).toThrow();
    });

    it('throws for empty string', () => {
      expect(() => formatRiskExposure('', 'AUTO')).toThrow();
    });

    it('throws for string with decimal (invalid for integer cents)', () => {
      expect(() => formatRiskExposure('123.45', 'AUTO')).toThrow();
    });

    it('throws for string with only whitespace', () => {
      expect(() => formatRiskExposure('  ', 'AUTO')).toThrow();
    });

    it('accepts negative cents and formats with minus sign', () => {
      expect(formatRiskExposure('-500000000', 'M')).toBe('-5.0M');
    });
  });

  describe('backward compatibility: number (dollars) input', () => {
    it('accepts number (dollars) and AUTO scales 5_000_000 to 5.0M', () => {
      expect(formatRiskExposure(5_000_000, 'AUTO')).toBe('5.0M');
    });

    it('accepts number with forced K scale', () => {
      expect(formatRiskExposure(5_000_000, 'K')).toBe('5000.0K');
    });
  });
});
