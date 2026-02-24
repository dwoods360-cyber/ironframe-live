import { describe, it, expect } from 'vitest';
import { calculateRiskLevel } from './ale-engine';

describe('IronTrust ALE Engine: Constitutional Baselines', () => {
  const MEDSHIELD_THRESHOLD = 1110000000n; // $11.1M in cents
  const VAULTBANK_THRESHOLD = 590000000n;   // $5.9M in cents
  const GRIDCORE_THRESHOLD = 470000000n;   // $4.7M in cents

  it('freezes Medshield risk baseline', () => {
    // Testing exactly at threshold
    expect(calculateRiskLevel(MEDSHIELD_THRESHOLD, MEDSHIELD_THRESHOLD))
      .toMatchInlineSnapshot(`"ELEVATED"`);
  });

  it('freezes Vaultbank risk baseline', () => {
    // Testing 1 cent over threshold
    expect(calculateRiskLevel(VAULTBANK_THRESHOLD + 1n, VAULTBANK_THRESHOLD))
      .toMatchInlineSnapshot(`"CRITICAL"`);
  });

  it('freezes Gridcore risk baseline', () => {
    // Testing well below threshold
    expect(calculateRiskLevel(GRIDCORE_THRESHOLD / 4n, GRIDCORE_THRESHOLD))
      .toMatchInlineSnapshot(`"ACCEPTABLE"`);
  });
});

describe('IronTrust ALE Engine: Hardened Boundary Tests', () => {

  const THRESHOLD = 1000000000n; // 1 Billion Cents ($10M)

  it('one cent above threshold is CRITICAL (Off-by-One)', () => {
    expect(calculateRiskLevel(THRESHOLD + 1n, THRESHOLD)).toBe('CRITICAL');
  });

  it('exact threshold is NOT critical (Boundary Kill)', () => {
    // This kills the > to >= mutation
    expect(calculateRiskLevel(THRESHOLD, THRESHOLD)).not.toBe('CRITICAL');
    expect(calculateRiskLevel(THRESHOLD, THRESHOLD)).toBe('ELEVATED');
  });

  it('one cent below threshold is ELEVATED', () => {
    expect(calculateRiskLevel(THRESHOLD - 1n, THRESHOLD)).toBe('ELEVATED');
  });

  it('exact 50% threshold is ELEVATED (Boundary Kill)', () => {
    // This kills the logic drift on the lower bucket
    const half = THRESHOLD / 2n;
    expect(calculateRiskLevel(half, THRESHOLD)).toBe('ELEVATED');
  });

  it('one cent below 50% threshold is ACCEPTABLE', () => {
    const justBelowHalf = (THRESHOLD / 2n) - 1n;
    expect(calculateRiskLevel(justBelowHalf, THRESHOLD)).toBe('ACCEPTABLE');
  });

  it('higher ALE always results in same or higher risk (Monotonic Invariant)', () => {
    const low = calculateRiskLevel(THRESHOLD / 4n, THRESHOLD);   // 25%
    const mid = calculateRiskLevel(THRESHOLD / 2n, THRESHOLD);   // 50%
    const high = calculateRiskLevel(THRESHOLD + 1n, THRESHOLD);  // 101%

    const results = [low, mid, high];
    expect(results).toEqual(['ACCEPTABLE', 'ELEVATED', 'CRITICAL']);
  });

  describe('Financial Guardrails', () => {
    it('throws an error if ALE is negative', () => {
      // Kills mutants changing < 0n to <= 0n or deleting the check
      expect(() => calculateRiskLevel(-1n, THRESHOLD)).toThrow("Financial values must be positive integers.");
    });

    it('throws an error if threshold is zero or negative', () => {
      expect(() => calculateRiskLevel(THRESHOLD, 0n)).toThrow();
      expect(() => calculateRiskLevel(THRESHOLD, -1n)).toThrow();
    });

    it('throws if both values are invalid (Logical OR Check)', () => {
      // Kills the mutant changing || to &&
      expect(() => calculateRiskLevel(-1n, -1n)).toThrow("Financial values must be positive integers.");
    });

    it('allows zero as a valid ALE value (Boundary Kill)', () => {
      // This kills the < 0n to <= 0n mutation
      expect(calculateRiskLevel(0n, THRESHOLD)).toBe('ACCEPTABLE');
    });
  });
});
