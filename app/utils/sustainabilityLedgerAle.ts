/** Sealed ICP — $85.00 / metric ton (matches `INTERNAL_CARBON_PRICE_CENTS_PER_TON` in Ironbloom scoring). */
export const INTERNAL_CARBON_PRICE_CENTS_PER_TON = 8500n;

const GRAMS_PER_METRIC_TON = 1_000_000n;

export type LedgerAleRowInput = {
  energyConsumedKwh: string;
  carbonIntensityGrams: string;
};

/**
 * CFO carbon ALE (cents): `(kWh × g/kWh × ICP ¢/ton) / 1_000_000` — BigInt-only money path.
 */
export function computeLedgerCarbonAleCents(rows: LedgerAleRowInput[]): bigint {
  let total = 0n;
  for (const row of rows) {
    const kwh = BigInt(row.energyConsumedKwh || "0");
    const grams = BigInt(row.carbonIntensityGrams || "0");
    if (kwh <= 0n || grams <= 0n) continue;
    total += (kwh * grams * INTERNAL_CARBON_PRICE_CENTS_PER_TON) / GRAMS_PER_METRIC_TON;
  }
  return total;
}

export function formatAleCentsUsd(cents: bigint): string {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "—";
  return (n / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
