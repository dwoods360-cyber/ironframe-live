export type CurrencyMagnitude = "AUTO" | "K" | "M" | "B" | "T";

/** Format a raw dollar exposure into scaled units (K, M, B, T). */
export function formatRiskExposure(value: number, scale: CurrencyMagnitude): string {
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
    // No suffix, still strict toFixed(1)
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

