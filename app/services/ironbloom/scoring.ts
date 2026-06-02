import "server-only";

import { createHash } from "crypto";
import {
  TENANT_ELECTRICITY_MAP_ZONES,
  TENANT_REGULATORY_CARBON_MULTIPLIER_BPS,
} from "@/app/config/tenantCarbonZones";
import { TENANT_INDUSTRY_BASELINE_ALE_CENTS } from "@/app/constants/devTenantRoster";
import type {
  CarbonIntensityQuote,
  SealedMitigatedValueCents,
  SustainabilityAleBreakdown,
} from "@/app/types/ironbloomScoring";
import { tenantKeyFromUuid, type TenantKey } from "@/app/utils/tenantIsolation";
import {
  IronbloomCriticalIngestionError,
  IronbloomIngestUnprocessableError,
  validateIronbloomEsgEntry,
} from "@/lib/sustainability/constants";
import {
  buildForensicFallbackQuote,
  FALLBACK_CARBON_INTENSITY,
} from "@/app/services/ironbloom/rateEngine";
import {
  ELECTRICITY_MAPS_CARBON_LATEST,
  fetchElectricityMapsJson,
  getElectricityMapsApiKey,
  isProductionElectricityMapsKey,
  logCarbonIngressFallback,
  parseCarbonIntensityGco2PerKwh,
} from "@/app/services/ironbloom/electricityMapsClient";
import { computeCarbonAleUsd } from "@/app/utils/ironbloomCarbonAleMath";

export { computeCarbonAleUsd, FALLBACK_CARBON_INTENSITY };

/** Internal Carbon Price — $85.00 / metric ton (sealed BigInt cents per ton). */
export const INTERNAL_CARBON_PRICE_CENTS_PER_TON = 8500n;

/** US-MN forensic anchor as BigInt gCO₂eq/kWh for the ICP audit pipeline. */
export const FORENSIC_CARBON_INTENSITY_GCO2_PER_KWH = 380n;

const GRAMS_PER_METRIC_TON_BIGINT = 1_000_000n;

/**
 * Precision mitigated value (cents): `(kWh × g/kWh × ICP ¢/ton) / 1_000_000`.
 * BigInt-only — no `Math.round` or float on the money path.
 */
export function computeMitigatedValueCentsFromIcp(
  kwhSaved: bigint,
  carbonIntensityGco2PerKwh: bigint = FORENSIC_CARBON_INTENSITY_GCO2_PER_KWH,
): bigint {
  if (kwhSaved < 0n) return 0n;
  if (carbonIntensityGco2PerKwh < 0n) return 0n;
  return (kwhSaved * carbonIntensityGco2PerKwh * INTERNAL_CARBON_PRICE_CENTS_PER_TON) /
    GRAMS_PER_METRIC_TON_BIGINT;
}

/** Physical kWh → integer BigInt (boundary conversion only; ingest validates > 0). */
export function physicalKwhToBigInt(kwh: number): bigint {
  if (!Number.isFinite(kwh) || kwh <= 0) return 0n;
  return BigInt(kwh | 0);
}

function carbonIntensityGco2ToBigInt(gco2PerKwh: number): bigint {
  if (!Number.isFinite(gco2PerKwh) || gco2PerKwh <= 0) return FORENSIC_CARBON_INTENSITY_GCO2_PER_KWH;
  return BigInt(gco2PerKwh | 0);
}

/**
 * Live carbon intensity via Electricity Maps (`ELECTRICITY_MAPS_API_KEY`).
 * When the key is absent, staging, rate-limited, or upstream errors: US-MN forensic anchor.
 */
export async function fetchLiveCarbonIntensity(
  zone: string,
  tenantKey?: TenantKey | null,
): Promise<CarbonIntensityQuote> {
  void tenantKey;
  const polledAt = new Date().toISOString();
  const token = getElectricityMapsApiKey();

  if (!token) {
    logCarbonIngressFallback({ zone, reason: "missing_api_key" });
    return buildForensicFallbackQuote(zone);
  }

  if (!isProductionElectricityMapsKey(token)) {
    logCarbonIngressFallback({ zone, reason: "staging_key" });
    return buildForensicFallbackQuote(zone);
  }

  const result = await fetchElectricityMapsJson(ELECTRICITY_MAPS_CARBON_LATEST, zone, token);
  if (!result.ok) {
    logCarbonIngressFallback({ zone, reason: result.reason, detail: result.detail });
    return buildForensicFallbackQuote(zone);
  }

  const intensity = parseCarbonIntensityGco2PerKwh(result.data);
  if (intensity == null) {
    logCarbonIngressFallback({ zone, reason: "invalid_payload", detail: "missing carbon intensity" });
    return buildForensicFallbackQuote(zone);
  }

  return {
    zone,
    carbonIntensityGco2PerKwh: intensity,
    source: "electricity-maps",
    polledAt,
  };
}

/** Resolve intensity for sealed `mitigatedValueCents` — never returns null g/kWh. */
export async function resolveCarbonIntensityForMitigation(
  zone: string,
  tenantKey?: TenantKey | null,
): Promise<CarbonIntensityQuote> {
  const quote = await fetchLiveCarbonIntensity(zone, tenantKey);
  if (
    quote.carbonIntensityGco2PerKwh > 0 &&
    Number.isFinite(quote.carbonIntensityGco2PerKwh)
  ) {
    return quote;
  }
  return buildForensicFallbackQuote(zone);
}

export async function fetchLiveCarbonIntensityForTenant(tenantKey: TenantKey): Promise<CarbonIntensityQuote> {
  const zone = TENANT_ELECTRICITY_MAP_ZONES[tenantKey];
  return fetchLiveCarbonIntensity(zone, tenantKey);
}

/**
 * Seal `mitigatedValueCents` as immutable BigInt — no float on the financial path.
 */
export function sealMitigatedValueCents(params: {
  mitigatedValueCents: bigint;
  tenantKey: TenantKey;
  unitsKwh: number;
  zone: string;
  carbonIntensityGco2PerKwh: number;
}): SealedMitigatedValueCents {
  if (params.mitigatedValueCents < 0n) {
    throw new Error("IRONBLOOM: mitigatedValueCents must be non-negative BigInt cents.");
  }
  const sealedAt = new Date().toISOString();
  const sealDigest = createHash("sha256")
    .update(
      [
        params.tenantKey,
        params.zone,
        String(params.unitsKwh),
        String(params.carbonIntensityGco2PerKwh),
        params.mitigatedValueCents.toString(),
        sealedAt,
      ].join("|"),
      "utf8",
    )
    .digest("hex");
  return Object.freeze({ mitigatedValueCents: params.mitigatedValueCents, sealDigest, sealedAt });
}

export function assertSealedMitigatedValueCents(sealed: SealedMitigatedValueCents): void {
  if (sealed.mitigatedValueCents < 0n) {
    throw new Error("IRONBLOOM SEALED NODE: negative mitigatedValueCents rejected.");
  }
  if (!sealed.sealDigest?.trim() || sealed.sealDigest.length !== 64) {
    throw new Error("IRONBLOOM SEALED NODE: mitigated value digest missing or invalid.");
  }
}

export async function computeSustainabilityAle(params: {
  tenantKey: TenantKey;
  unitsKwh: number;
  assetId: string;
  payload?: unknown;
}): Promise<SustainabilityAleBreakdown> {
  try {
    validateIronbloomEsgEntry({
      assetId: params.assetId,
      kwh: params.unitsKwh,
      payload: params.payload,
    });
  } catch (e) {
    if (e instanceof IronbloomIngestUnprocessableError) {
      throw new IronbloomCriticalIngestionError(params.assetId);
    }
    throw e;
  }

  if (!Number.isFinite(params.unitsKwh) || params.unitsKwh <= 0) {
    throw new IronbloomCriticalIngestionError(
      params.assetId,
      "Physical kWh quantity must be > 0 for carbon ALE.",
    );
  }

  const zone = TENANT_ELECTRICITY_MAP_ZONES[params.tenantKey];
  const intensity = await resolveCarbonIntensityForMitigation(zone, params.tenantKey);
  const offsetPriceCentsPerMetricTon = INTERNAL_CARBON_PRICE_CENTS_PER_TON;
  const regulatoryMultiplierBps = TENANT_REGULATORY_CARBON_MULTIPLIER_BPS[params.tenantKey];

  const kwhBig = physicalKwhToBigInt(params.unitsKwh);
  const ciBig =
    intensity.source === "FORENSIC_FALLBACK"
      ? FORENSIC_CARBON_INTENSITY_GCO2_PER_KWH
      : carbonIntensityGco2ToBigInt(intensity.carbonIntensityGco2PerKwh);
  const rawMitigatedCents = computeMitigatedValueCentsFromIcp(kwhBig, ciBig);
  const gramsCo2e = kwhBig * ciBig;
  const metricTonsCo2e = Number(gramsCo2e) / 1_000_000;
  const sealedMitigation = sealMitigatedValueCents({
    mitigatedValueCents: rawMitigatedCents,
    tenantKey: params.tenantKey,
    unitsKwh: params.unitsKwh,
    zone: intensity.zone,
    carbonIntensityGco2PerKwh: intensity.carbonIntensityGco2PerKwh,
  });
  const mitigatedValueCents = sealedMitigation.mitigatedValueCents;

  const offsetPriceUsdPerMetricTon = 85;
  const regulatoryMultiplier = Number(regulatoryMultiplierBps) / 10000;
  const { aleCarbonUsd } = computeCarbonAleUsd({
    unitsKwh: params.unitsKwh,
    carbonIntensityGco2PerKwh: intensity.carbonIntensityGco2PerKwh,
    offsetPriceUsdPerMetricTon,
    regulatoryMultiplier,
  });
  const tenantTotalAleCents = TENANT_INDUSTRY_BASELINE_ALE_CENTS[params.tenantKey];
  const carbonShareOfTenantAleBps =
    tenantTotalAleCents > 0n
      ? (mitigatedValueCents * 10000n) / tenantTotalAleCents
      : 0n;

  return {
    unitsKwh: params.unitsKwh,
    carbonIntensityGco2PerKwh: intensity.carbonIntensityGco2PerKwh,
    offsetPriceUsdPerMetricTon,
    regulatoryMultiplier,
    metricTonsCo2e,
    aleCarbonUsd,
    mitigatedValueCents,
    sealedMitigation,
    tenantTotalAleCents,
    carbonShareOfTenantAleBps,
    zone: intensity.zone,
  };
}

export async function computeSustainabilityAleForTenantUuid(params: {
  tenantUuid: string;
  unitsKwh: number;
  assetId: string;
  payload?: unknown;
}): Promise<SustainabilityAleBreakdown> {
  const tenantKey = tenantKeyFromUuid(params.tenantUuid) ?? "gridcore";
  return computeSustainabilityAle({
    tenantKey,
    unitsKwh: params.unitsKwh,
    assetId: params.assetId,
    payload: params.payload,
  });
}
