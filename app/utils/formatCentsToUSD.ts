/**
 * Epic 8 / audit-grade USD from integer cents: always `$#,###.##` with two fraction digits.
 * Uses `BigInt` for the cents → dollars split; no `parseFloat` on monetary inputs.
 */
export function formatCentsToAccountingUSD(cents: bigint | string): string {
  let n: bigint;
  try {
    const raw = typeof cents === "bigint" ? cents.toString() : String(cents ?? "0").trim().replace(/,/g, "");
    n = BigInt(raw === "" ? "0" : raw);
  } catch {
    return "$0.00";
  }
  const neg = n < 0n;
  const abs = neg ? -n : n;
  const dollars = abs / 100n;
  const frac = abs % 100n;
  const fracStr = frac < 10n ? `0${frac}` : `${frac}`;
  const sign = neg ? "-" : "";
  const wholeFormatted = dollars.toLocaleString("en-US");
  return `${sign}$${wholeFormatted}.${fracStr}`;
}

/** Compact USD label from integer cents (no floats in storage; display uses Number for formatting only). */
export function formatCentsToUSD(cents: bigint | string | number): string {
  const n = typeof cents === "bigint" ? Number(cents) : Number(cents);
  if (!Number.isFinite(n)) return "$0";
  const dollars = n / 100;
  const abs = Math.abs(dollars);
  const sign = dollars < 0 ? "-" : "";
  const v = abs;
  if (v >= 1_000_000) return `${sign}$${(dollars / 1_000_000).toFixed(1)}M`;
  if (v >= 100_000) return `${sign}$${Math.round(dollars / 1_000)}K`;
  if (v >= 1_000) return `${sign}$${(dollars / 1_000).toFixed(1)}K`;
  return (
    sign +
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(dollars)
  );
}

export function formatEstimatedFineLabel(fineCents: bigint): string {
  return `Est. Fine: ${formatCentsToUSD(fineCents)}`;
}
