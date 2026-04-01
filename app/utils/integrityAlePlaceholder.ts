/** Epic 7: swap for Irontrust ALE aggregation (BigInt cents from Irontrust). */
export const ALE_MITIGATED_PLACEHOLDER_CENTS = BigInt("24500000000");

export function formatAleUsdFromCents(cents: bigint): string {
  const dollars = Number(cents) / 100;
  if (!Number.isFinite(dollars)) return "—";
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(2)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(2)}K`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    dollars,
  );
}
