/** Sovereign pool baselines — whole-integer cents only. Float/Decimal forbidden. */
export const SOVEREIGN_POOL_BASELINES = {
  medshield_cents: 1110000000n,
  vaultbank_cents: 590000000n,
  gridcore_cents: 470000000n,
} as const;

export const PLATFORM_BASELINE_SUM_CENTS =
  SOVEREIGN_POOL_BASELINES.medshield_cents +
  SOVEREIGN_POOL_BASELINES.vaultbank_cents +
  SOVEREIGN_POOL_BASELINES.gridcore_cents;

export class FinancialIntegrityError extends Error {
  readonly code = 'FINANCIAL_INTEGRITY_VIOLATION';

  constructor(message: string) {
    super(message);
    this.name = 'FinancialIntegrityError';
  }
}

/** Rejects fractional floats and non-integer financial inputs. */
export function assertWholeIntegerCents(value: unknown, label: string): bigint {
  if (typeof value === 'bigint') {
    if (value < 0n) {
      throw new FinancialIntegrityError(`${label}: negative BigInt cents rejected.`);
    }
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new FinancialIntegrityError(
        `${label}: fractional float rejected — BIGINT integer cents only.`,
      );
    }
    return BigInt(value);
  }

  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return BigInt(value.trim());
  }

  throw new FinancialIntegrityError(
    `${label}: unverified financial entry — only whole-integer cent values permitted.`,
  );
}

/** Terminates processing if sovereign pool sum drifts from constitutional total. */
export function validateSovereignPoolBaselines(): typeof SOVEREIGN_POOL_BASELINES {
  const { medshield_cents, vaultbank_cents, gridcore_cents } = SOVEREIGN_POOL_BASELINES;

  assertWholeIntegerCents(medshield_cents, 'synthetic demo seed medshield');
  assertWholeIntegerCents(vaultbank_cents, 'synthetic demo seed vaultbank');
  assertWholeIntegerCents(gridcore_cents, 'synthetic demo seed gridcore');

  const sum = medshield_cents + vaultbank_cents + gridcore_cents;
  if (sum !== 2170000000n) {
    throw new FinancialIntegrityError(
      `Sovereign pool sum integrity failure: expected 2170000000 cents, computed ${sum.toString()}.`,
    );
  }

  return SOVEREIGN_POOL_BASELINES;
}
