export type CurrencyMagnitude = "AUTO" | "K" | "M" | "B" | "T";

/** TAS-compliant: parse cents string to dollars using BigInt (no precision loss). Throws for invalid input. */
function centsStringToDollars(centsString: string): number {
  const trimmed = centsString.trim();
  if (trimmed === "") {
    throw new Error("Invalid cents: empty string");
  }
  // Integer only (optional leading minus); reject decimals and non-numeric
  if (!/^-?\d+$/.test(trimmed)) {
    throw new Error("Invalid cents: must be an integer string");
  }
  const centsBigInt = BigInt(trimmed);
  const neg = centsBigInt < 0n;
  const absCents = neg ? -centsBigInt : centsBigInt;
  const dollarsWhole = absCents / 100n;
  const remainder = absCents % 100n;
  const dollarsValue = Number(dollarsWhole) + Number(remainder) / 100;
  return neg ? -dollarsValue : dollarsValue;
}

/** Internal: format a dollar value (number) into scaled units. */
function formatDollars(value: number, scale: CurrencyMagnitude): string {
  if (!Number.isFinite(value)) return "0.0";

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  let resolved: CurrencyMagnitude = scale;
  if (scale === "AUTO") {
    if (abs >= 1_000_000_000_000) resolved = "T";
    else if (abs >= 1_000_000_000) resolved = "B";
    else if (abs >= 1_000_000) resolved = "M";
    else if (abs >= 1_000) resolved = "K";
    else resolved = "AUTO";
  }

  if (resolved === "AUTO") {
    return `${sign}${abs.toFixed(1)}`;
  }

  const divisor =
    resolved === "K"
      ? 1_000
      : resolved === "M"
        ? 1_000_000
        : resolved === "B"
          ? 1_000_000_000
          : 1_000_000_000_000;

  const scaled = abs / divisor;
  const formatted = scaled.toFixed(1);

  return `${sign}${formatted}${resolved}`;
}

/**
 * Format risk exposure for display.
 * - If value is a string: treated as cents (integer string from API). Parsed with BigInt for precision.
 * - If value is a number: treated as dollars (backward compatible).
 * @throws Error for invalid cents string (empty, non-numeric, or decimal).
 */
export function formatRiskExposure(
  value: string | number,
  scale: CurrencyMagnitude
): string {
  const dollars =
    typeof value === "string" ? centsStringToDollars(value) : value;
  return formatDollars(dollars, scale);
}
