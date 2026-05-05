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
