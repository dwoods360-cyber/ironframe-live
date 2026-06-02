import "server-only";

import { createHash } from "crypto";
import {
  getDefaultCarbonIntensityGco2ForTenant,
  TENANT_ELECTRICITY_MAP_ZONES,
  tenantKeyFromElectricityMapZone,
} from "@/app/config/tenantCarbonZones";
import {
  appendCarbonSample,
  readCarbonPulseState,
  writeCarbonPulseState,
} from "@/app/lib/ironbloom/carbonPulseState";
import {
  readGridcoreCarbonLedgerState,
  writeGridcoreCarbonLedgerState,
  type GridcoreCarbonCoefficientRecord,
} from "@/app/lib/ironbloom/gridcoreCarbonLedgerState";
import { fetchLiveCarbonIntensity } from "@/app/services/ironbloom/scoring";
import {
  ELECTRICITY_MAPS_POWER_BREAKDOWN,
  fetchElectricityMapsJson,
  getElectricityMapsApiKey,
  isStagingElectricityMapsKey,
} from "@/app/services/ironbloom/electricityMapsClient";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

export {
  isStagingElectricityMapsKey,
} from "@/app/services/ironbloom/electricityMapsClient";

export type GridcoreCarbonLedgerSyncResult = {
  status: string;
  recordsIngested: number;
  timestamp: string;
  stagingFallback: boolean;
  zones: string[];
};

function uniqueRosterZones(): string[] {
  return [...new Set(Object.values(TENANT_ELECTRICITY_MAP_ZONES))];
}

function gramsFromGco2PerKwh(gco2: number): bigint {
  if (!Number.isFinite(gco2) || gco2 <= 0) return 0n;
  return BigInt(Math.round(gco2));
}

function buildTelemetryFingerprint(zone: string, polledAt: Date, grams: bigint): string {
  return createHash("sha256")
    .update(`${zone}:${polledAt.getTime()}:${grams.toString()}`)
    .digest("hex");
}

function parseRenewableShare(data: Record<string, unknown>): number | null {
  const direct =
    typeof data.renewablePercentage === "number"
      ? data.renewablePercentage
      : typeof data.renewable_share === "number"
        ? data.renewable_share
        : null;
  if (direct != null && Number.isFinite(direct) && direct >= 0) {
    return direct <= 1 ? direct * 100 : direct;
  }

  const breakdown = data.powerConsumptionBreakdown;
  if (!breakdown || typeof breakdown !== "object" || Array.isArray(breakdown)) return null;
  const b = breakdown as Record<string, unknown>;
  const renewable = typeof b.renewable === "number" ? b.renewable : null;
  const total =
    typeof b.total === "number"
      ? b.total
      : Object.values(b).reduce<number>((sum, v) => (typeof v === "number" ? sum + v : sum), 0);
  if (renewable != null && total > 0) return (renewable / total) * 100;
  return null;
}

/**
 * Optional Electricity Maps power-breakdown — renewable share (%).
 */
export async function fetchRenewableSharePercent(
  zone: string,
  apiKey: string,
): Promise<number | null> {
  const result = await fetchElectricityMapsJson(ELECTRICITY_MAPS_POWER_BREAKDOWN, zone, apiKey);
  if (!result.ok) return null;
  return parseRenewableShare(result.data);
}

async function resolveZoneIntensityGrams(
  zone: string,
  apiKey: string | undefined,
  stagingFallback: boolean,
): Promise<{ grams: bigint; gco2PerKwh: number; source: string }> {
  if (!stagingFallback && apiKey) {
    const quote = await fetchLiveCarbonIntensity(zone, tenantKeyFromElectricityMapZone(zone) ?? undefined);
    const gco2 = quote.carbonIntensityGco2PerKwh;
    return {
      grams: gramsFromGco2PerKwh(gco2),
      gco2PerKwh: gco2,
      source: quote.source,
    };
  }

  const tenantKey = tenantKeyFromElectricityMapZone(zone);
  const baselineGco2 = tenantKey
    ? getDefaultCarbonIntensityGco2ForTenant(tenantKey)
    : 475;
  return {
    grams: gramsFromGco2PerKwh(baselineGco2),
    gco2PerKwh: baselineGco2,
    source: "STAGING_BASELINE",
  };
}

/**
 * TAS §3 — Ironbloom (Agent 18): Gridcore carbon coefficient poll & production ledger sync.
 * Physical gCO₂eq/kWh only — monetary translation stays in threat-bound `SustainabilityMetric` rows.
 *
 * Distinct from {@link runGridcoreUtilityRatePoll} (USD/kWh utility rates).
 */
export async function executeGridcoreCarbonLedgerSync(): Promise<GridcoreCarbonLedgerSyncResult> {
  const apiKey = getElectricityMapsApiKey();
  const stagingFallback = isStagingElectricityMapsKey(apiKey);
  const pollTime = new Date();

  if (stagingFallback) {
    console.warn(
      "[IRONBLOOM WARNING] Operating under staging fallback credentials. Ingesting tenant-anchored coefficient baselines.",
    );
  }

  const targetZones = uniqueRosterZones();
  const coefficients: GridcoreCarbonCoefficientRecord[] = [];
  let carbonPulseState = await readCarbonPulseState();

  for (const zone of targetZones) {
    const { grams, gco2PerKwh, source } = await resolveZoneIntensityGrams(zone, apiKey, stagingFallback);
    const renewablePercentage =
      !stagingFallback && apiKey ? await fetchRenewableSharePercent(zone, apiKey) : null;

    const record: GridcoreCarbonCoefficientRecord = {
      zone,
      carbonIntensityGrams: grams.toString(),
      carbonIntensityGco2PerKwh: gco2PerKwh,
      renewablePercentage,
      source,
      polledAt: pollTime.toISOString(),
      telemetryFingerprint: buildTelemetryFingerprint(zone, pollTime, grams),
    };
    coefficients.push(record);

    const tenantKey = tenantKeyFromElectricityMapZone(zone);
    if (tenantKey) {
      const tenantId = TENANT_UUIDS[tenantKey];
      carbonPulseState = appendCarbonSample(carbonPulseState, tenantId, {
        at: pollTime.toISOString(),
        zone,
        gco2PerKwh: gco2PerKwh,
        mitigatedValueCents: "0",
        dirty: false,
      });
    }
  }

  await writeGridcoreCarbonLedgerState({
    lastSynchronizedAt: pollTime.toISOString(),
    coefficients,
  });
  await writeCarbonPulseState(carbonPulseState);

  return {
    status: "GRIDCORE_LEDGER_SYNCHRONIZED",
    recordsIngested: coefficients.length,
    timestamp: pollTime.toISOString(),
    stagingFallback,
    zones: targetZones,
  };
}

/** @alias Epic 9.3 sketch name — carbon coefficient poll (not USD/kWh utility rates). */
export const executeGridcoreRatePoll = executeGridcoreCarbonLedgerSync;
