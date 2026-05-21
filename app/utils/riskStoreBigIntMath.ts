/**
 * Pure BigInt helpers for pipeline / dashboard liability totals ($M → fixed-point cents).
 * Used by riskStore totals and unit-verified for zero drift vs per-entry cent sums.
 */
const CENTS_PER_DOLLAR = 100n;
const THOUSAND = 1_000n;
const MILLION = 1_000_000n;
const BILLION = 1_000_000_000n;

/**
 * Converts flexible currency text into pure integer cents.
 * Examples:
 * - "$1.1M" -> 110000000n
 * - "1100000" -> 110000000n
 * - "$42,750.25" -> 4275025n
 */
export function toBigIntCents(input: string): bigint {
  const raw = (input ?? "").trim();
  if (!raw) return 0n;

  const normalized = raw
    .replace(/[$,\s_]/g, "")
    .toUpperCase()
    .replace(/^USD/, "");
  if (!normalized) return 0n;

  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  if (!unsigned) return 0n;

  const lastChar = unsigned[unsigned.length - 1] ?? "";
  const multiplier =
    lastChar === "B" ? BILLION : lastChar === "M" ? MILLION : lastChar === "K" ? THOUSAND : 1n;
  const numeric = multiplier === 1n ? unsigned : unsigned.slice(0, -1);
  if (!numeric || !/^\d*\.?\d+$/.test(numeric)) return 0n;

  const [wholePart = "0", fractionalPart = ""] = numeric.split(".");
  const whole = BigInt(wholePart || "0");
  const fracDigits = fractionalPart.replace(/\D/g, "");
  const fracScale = 10n ** BigInt(fracDigits.length);
  const frac = fracDigits.length > 0 ? BigInt(fracDigits) : 0n;

  const dollarsScaled = whole * fracScale + frac;
  const cents = (dollarsScaled * multiplier * CENTS_PER_DOLLAR) / fracScale;
  return negative ? -cents : cents;
}

export function millionsNumberToCents(value: number): bigint {
  if (!Number.isFinite(value)) return 0n;
  const normalized = value.toFixed(8);
  const negative = normalized.startsWith("-");
  const raw = negative ? normalized.slice(1) : normalized;
  const [wholePart, fractionPart = ""] = raw.split(".");
  const whole = BigInt(wholePart || "0");
  const fraction = BigInt(fractionPart.padEnd(8, "0").slice(0, 8));
  const cents = whole * 100_000_000n + fraction;
  return negative ? -cents : cents;
}

function sumRecordMillionsToCents(record: Record<string, number>): bigint {
  return Object.values(record).reduce((sum, v) => sum + millionsNumberToCents(v), 0n);
}

/** Raw total before floor-at-zero (same formula as getTotalCurrentRiskCents). */
export function computeTotalCurrentRiskCentsRaw(
  acceptedThreatImpacts: Record<string, number>,
  dashboardLiabilities: Record<string, number>,
  riskOffset: number,
): bigint {
  return (
    sumRecordMillionsToCents(acceptedThreatImpacts) +
    sumRecordMillionsToCents(dashboardLiabilities) -
    millionsNumberToCents(riskOffset)
  );
}

/** Matches `useRiskStore.getState().getTotalCurrentRiskCents()` string output. */
export function getTotalCurrentRiskCentsString(
  acceptedThreatImpacts: Record<string, number>,
  dashboardLiabilities: Record<string, number>,
  riskOffset: number,
): string {
  const totalCents = computeTotalCurrentRiskCentsRaw(
    acceptedThreatImpacts,
    dashboardLiabilities,
    riskOffset,
  );
  return (totalCents > 0n ? totalCents : 0n).toString();
}
