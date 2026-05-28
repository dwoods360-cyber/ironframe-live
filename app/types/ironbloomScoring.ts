export type CarbonIntensityQuote = {
  zone: string;
  carbonIntensityGco2PerKwh: number;
  source:
    | "electricity-maps"
    | "tenant-location-default"
    | "forensic-estimate"
    | "FORENSIC_FALLBACK";
  /** CSRD transparency tag when intensity is estimated (e.g. `[ESTIMATED: REGIONAL_AVG]`). */
  transparencyLabel?: string;
  polledAt: string;
};

/** Immutable sealed carbon ALE cents (Kimbot / Ironbloom production ledger). */
export type SealedMitigatedValueCents = {
  mitigatedValueCents: bigint;
  sealDigest: string;
  sealedAt: string;
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
  /** SHA-256 attestation over tenant, units, intensity, and sealed cents. */
  sealedMitigation: SealedMitigatedValueCents;
  tenantTotalAleCents: bigint;
  /** Carbon ALE as basis points of constitutional tenant ALE (0–10000). */
  carbonShareOfTenantAleBps: bigint;
  zone: string;
};
