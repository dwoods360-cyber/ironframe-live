/**
 * Iteration 2.1: $10M GRC Ingestion Gate (Backlog Item 2).
 * Unit tests for GRC gate logic: high-value threats require 50+ char justification.
 */
import { describe, it, expect } from 'vitest';
import { grcGatePass } from '@/app/utils/grcGate';

const ONE_MILLION_CENTS = 100_000_000;
const TEN_MILLION_CENTS = 1_000_000_000;

describe('GRC Ingestion Gate — $10M justification', () => {
  it('Test 1: Small threat ($1M) with no note → PASS', () => {
    expect(grcGatePass(ONE_MILLION_CENTS, '')).toBe(true);
  });

  it('Test 2: Big threat ($10M) with 10-char note → FAIL (Must block)', () => {
    expect(grcGatePass(TEN_MILLION_CENTS, '1234567890')).toBe(false);
  });

  it('Test 3: Big threat ($10M) with 55-char note → PASS', () => {
    const justification = 'A'.repeat(55);
    expect(justification.length).toBe(55);
    expect(grcGatePass(TEN_MILLION_CENTS, justification)).toBe(true);
  });
});
