/** Default monthly Ironbloom mitigated-value ceiling — $50,000 (BigInt cents). */
export const DEFAULT_MONTHLY_CARBON_BUDGET_THRESHOLD_CENTS = 5_000_000n;

/**
 * Monthly carbon budget threshold for Budget Reallocation alerts (BigInt cents).
 * Override via `IRONBLOOM_MONTHLY_CARBON_BUDGET_THRESHOLD_CENTS`.
 */
export function resolveMonthlyCarbonBudgetThresholdCents(): bigint {
  const raw = process.env.IRONBLOOM_MONTHLY_CARBON_BUDGET_THRESHOLD_CENTS?.trim();
  if (!raw) return DEFAULT_MONTHLY_CARBON_BUDGET_THRESHOLD_CENTS;
  try {
    const n = BigInt(raw);
    return n > 0n ? n : DEFAULT_MONTHLY_CARBON_BUDGET_THRESHOLD_CENTS;
  } catch {
    return DEFAULT_MONTHLY_CARBON_BUDGET_THRESHOLD_CENTS;
  }
}
