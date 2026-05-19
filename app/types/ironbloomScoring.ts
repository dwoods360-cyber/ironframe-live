export type CarbonIntensityQuote = {
  zone: string;
  carbonIntensityGco2PerKwh: number;
  source: "electricity-maps" | "dev-fallback";
  polledAt: string;
};

export type SustainabilityAleBreakdown = {
  unitsKwh: number;
  carbonIntensityGco2PerKwh: number;
  offsetPriceUsdPerMetricTon: number;
  regulatoryMultiplier: number;
  /** Metric tons CO₂e implied by energy × intensity. */
  metricTonsCo2e: number;
  /** ALE_carbon in USD before cents rounding. */
  aleCarbonUsd: number;
  /** Native BigInt cents — persisted to `mitigatedValueCents`. */
  mitigatedValueCents: bigint;
  tenantTotalAleCents: bigint;
  /** Carbon ALE as basis points of constitutional tenant ALE (0–10000). */
  carbonShareOfTenantAleBps: bigint;
  zone: string;
};
