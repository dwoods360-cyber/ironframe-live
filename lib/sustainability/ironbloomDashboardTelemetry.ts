/**
 * Ironbloom dashboard + threat stream telemetry — bridges ingestion JSON to normalizeIronbloomTelemetry().
 * No server-only import (safe for unit tests).
 */
import { TENANT_ELECTRICITY_MAP_ZONES } from "@/app/config/tenantCarbonZones";
import type { TenantKey } from "@/app/utils/tenantIsolation";
import {
  InvalidIronbloomMetricError,
  IRONBLOOM_PHYSICAL_UNIT,
  normalizeIronbloomTelemetry,
  validateIronbloomIngress,
  type CarbonTraceRecord,
  type IronbloomIngressPayload,
} from "@/lib/sustainability/ironbloom";

export const INTERNAL_CARBON_PRICE_CENTS_PER_TON = 8500n;
const GRAMS_PER_METRIC_TON = 1_000_000n;

export type ValidatedPhysicalTelemetry = IronbloomIngressPayload & {
  physical: { kwh: number; liters: number; km: number; fuelCategory?: "diesel" | "gasoline" | "natural_gas" | "generic" };
};

export function parseJsonTelemetryBody(raw: string | null | undefined): unknown {
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { telemetryText: raw };
  }
}

/** Parse DMZ / threat `ingestionDetails` into validated physical telemetry, or null. */
export function parseStreamTelemetryBody(body: unknown): ValidatedPhysicalTelemetry | null {
  if (body == null) return null;
  try {
    return validateIronbloomIngress(body);
  } catch {
    return null;
  }
}

export function parseThreatIngestionTelemetry(
  ingestionDetails: string | null | undefined,
): ValidatedPhysicalTelemetry | null {
  return parseStreamTelemetryBody(parseJsonTelemetryBody(ingestionDetails));
}

export function buildCarbonTraceFromStream(input: {
  tenantId: string;
  tenantKey?: TenantKey | null;
  assetId?: string;
  body: unknown;
  zone?: string;
}): CarbonTraceRecord | null {
  const validated = parseStreamTelemetryBody(input.body);
  if (!validated) return null;
  try {
    return normalizeIronbloomTelemetry({
      tenantId: input.tenantId,
      tenantKey: input.tenantKey ?? null,
      assetId: input.assetId,
      payload: validated,
      zone: input.zone ?? validated.zone,
    });
  } catch (error) {
    if (error instanceof InvalidIronbloomMetricError) return null;
    throw error;
  }
}

/** Mitigated value (BigInt cents) from a normalized carbon trace — ICP $85/t sealed path. */
export function mitigatedValueCentsFromCarbonTrace(trace: CarbonTraceRecord): bigint {
  if (trace.carbonGramsCo2e <= 0n) return 0n;
  return (trace.carbonGramsCo2e * INTERNAL_CARBON_PRICE_CENTS_PER_TON) / GRAMS_PER_METRIC_TON;
}

export function coolingWaterLitersFromKwh(kwh: number): number {
  if (!Number.isFinite(kwh) || kwh <= 0) return 0;
  return kwh * 1.8;
}

export function resolveTenantElectricityZone(tenantKey: TenantKey | null): string | null {
  if (!tenantKey) return null;
  return TENANT_ELECTRICITY_MAP_ZONES[tenantKey] ?? null;
}

export function energyKwhForLedgerZone(input: {
  zone: string;
  tenantKey: TenantKey | null;
  aggregateKwhAverted: bigint;
}): bigint {
  const tenantZone = resolveTenantElectricityZone(input.tenantKey);
  if (!tenantZone || input.zone !== tenantZone) return 0n;
  return input.aggregateKwhAverted;
}

export function formatPhysicalQuantityLabel(trace: CarbonTraceRecord): string {
  if (trace.physicalUnit === IRONBLOOM_PHYSICAL_UNIT.KWH) {
    return `${trace.physicalQuantity} kWh`;
  }
  if (trace.physicalUnit === IRONBLOOM_PHYSICAL_UNIT.LITERS) {
    return `${trace.physicalQuantity} L`;
  }
  return `${trace.physicalQuantity} km`;
}
