const GRAMS_PER_METRIC_TON = 1_000_000;

/** Default P_offset: $100.00 / metric ton → 10000 USD cents per ton. */
export const DEFAULT_OFFSET_PRICE_CENTS_PER_METRIC_TON = 10000n;

/**
 * ALE_carbon = (Units_kWh × CI_gCO2) × P_offset × R_tax
 * Returns metric tons and USD (before BigInt cents rounding).
 */
export function computeCarbonAleUsd(params: {
  unitsKwh: number;
  carbonIntensityGco2PerKwh: number;
  offsetPriceUsdPerMetricTon: number;
  regulatoryMultiplier: number;
}): { metricTonsCo2e: number; aleCarbonUsd: number } {
  const gramsCo2e = params.unitsKwh * params.carbonIntensityGco2PerKwh;
  const metricTonsCo2e = gramsCo2e / GRAMS_PER_METRIC_TON;
  const aleCarbonUsd =
    metricTonsCo2e * params.offsetPriceUsdPerMetricTon * params.regulatoryMultiplier;
  return { metricTonsCo2e, aleCarbonUsd };
}

/**
 * BigInt-native sustainability ALE (no float on money path).
 * `regulatoryMultiplierBps`: 10000 = 1.00×, 11500 = 1.15×.
 */
export function computeCarbonAleCents(params: {
  unitsKwh: number;
  carbonIntensityGco2PerKwh: number;
  offsetPriceCentsPerMetricTon?: bigint;
  regulatoryMultiplierBps: bigint;
}): { metricTonsCo2e: number; mitigatedValueCents: bigint } {
  const offsetCents = params.offsetPriceCentsPerMetricTon ?? DEFAULT_OFFSET_PRICE_CENTS_PER_METRIC_TON;
  const units = BigInt(Math.max(0, Math.round(params.unitsKwh)));
  const ci = BigInt(Math.max(0, Math.round(params.carbonIntensityGco2PerKwh)));
  const gramsCo2e = units * ci;
  const mitigatedValueCents =
    (gramsCo2e * offsetCents * params.regulatoryMultiplierBps) /
    (BigInt(GRAMS_PER_METRIC_TON) * 10000n);
  const metricTonsCo2e = Number(gramsCo2e) / GRAMS_PER_METRIC_TON;
  return { metricTonsCo2e, mitigatedValueCents };
}

export function aleCarbonUsdToCents(aleCarbonUsd: number): bigint {
  if (!Number.isFinite(aleCarbonUsd) || aleCarbonUsd < 0) return 0n;
  return BigInt(Math.round(aleCarbonUsd * 100));
}

export function offsetPriceCentsPerMetricTonFromEnv(): bigint {
  const raw = process.env.CARBON_OFFSET_PRICE_USD_PER_TON?.trim();
  if (!raw) return DEFAULT_OFFSET_PRICE_CENTS_PER_METRIC_TON;
  const usd = Number.parseFloat(raw);
  if (!Number.isFinite(usd) || usd <= 0) return DEFAULT_OFFSET_PRICE_CENTS_PER_METRIC_TON;
  return BigInt(Math.round(usd * 100));
}
