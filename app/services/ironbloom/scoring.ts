import "server-only";

import {
  TENANT_ELECTRICITY_MAP_ZONES,
  TENANT_REGULATORY_CARBON_MULTIPLIER_BPS,
} from "@/app/config/tenantCarbonZones";
import { TENANT_INDUSTRY_BASELINE_ALE_CENTS } from "@/app/constants/devTenantRoster";
import type { CarbonIntensityQuote, SustainabilityAleBreakdown } from "@/app/types/ironbloomScoring";
import { tenantKeyFromUuid, type TenantKey } from "@/app/utils/tenantIsolation";
import {
  IronbloomCriticalIngestionError,
  IronbloomIngestUnprocessableError,
  validateIronbloomEsgEntry,
} from "@/lib/sustainability/constants";
import {
  computeCarbonAleCents,
  computeCarbonAleUsd,
  DEFAULT_OFFSET_PRICE_CENTS_PER_METRIC_TON,
  offsetPriceCentsPerMetricTonFromEnv,
} from "@/app/utils/ironbloomCarbonAleMath";

export {
  computeCarbonAleCents,
  computeCarbonAleUsd,
  DEFAULT_OFFSET_PRICE_CENTS_PER_METRIC_TON,
};

const ELECTRICITY_MAPS_LATEST = "https://api.electricitymaps.com/v3/carbon-intensity/latest";

/** Dev fallback grid intensity (gCO₂/kWh) when API key absent. */
const DEV_FALLBACK_INTENSITY_GCO2 = 385;

export async function fetchLiveCarbonIntensity(zone: string): Promise<CarbonIntensityQuote> {
  const polledAt = new Date().toISOString();
  const token = process.env.ELECTRICITY_MAPS_API_KEY?.trim();

  if (token) {
    const url = new URL(ELECTRICITY_MAPS_LATEST);
    url.searchParams.set("zone", zone);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      const intensity =
        typeof data.carbonIntensity === "number"
          ? data.carbonIntensity
          : typeof data.carbon_intensity === "number"
            ? data.carbon_intensity
            : typeof data.gco2PerKwh === "number"
              ? data.gco2PerKwh
              : null;
      if (intensity != null && intensity > 0) {
        return {
          zone,
          carbonIntensityGco2PerKwh: intensity,
          source: "electricity-maps",
          polledAt,
        };
      }
    }
  }

  return {
    zone,
    carbonIntensityGco2PerKwh: DEV_FALLBACK_INTENSITY_GCO2,
    source: "dev-fallback",
    polledAt,
  };
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
  const intensity = await fetchLiveCarbonIntensity(zone);
  const offsetPriceCentsPerMetricTon = offsetPriceCentsPerMetricTonFromEnv();
  const regulatoryMultiplierBps = TENANT_REGULATORY_CARBON_MULTIPLIER_BPS[params.tenantKey];

  const { metricTonsCo2e, mitigatedValueCents } = computeCarbonAleCents({
    unitsKwh: params.unitsKwh,
    carbonIntensityGco2PerKwh: intensity.carbonIntensityGco2PerKwh,
    offsetPriceCentsPerMetricTon,
    regulatoryMultiplierBps,
  });

  const offsetPriceUsdPerMetricTon = Number(offsetPriceCentsPerMetricTon) / 100;
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
