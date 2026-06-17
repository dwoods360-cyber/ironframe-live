/**
 * Ironbloom sustainability core — physical-unit ingress validation and telemetry normalization.
 * Safe to import from API routes, server actions, and Vitest (no server-only).
 */
import { z } from "zod";

import {
  getDefaultCarbonIntensityGco2ForTenant,
  normalizeElectricityMapsZone,
  TENANT_ELECTRICITY_MAP_ZONES,
} from "@/app/config/tenantCarbonZones";
import type { TenantKey } from "@/app/utils/tenantIsolation";

export const INVALID_IRONBLOOM_METRIC_HOURS_OR_MONETARY_ONLY =
  "INVALID_IRONBLOOM_METRIC_HOURS_OR_MONETARY_ONLY" as const;

export const IRONBLOOM_PHYSICAL_UNIT = {
  KWH: "kWh",
  LITERS: "L",
  KM: "km",
} as const;

export type IronbloomPhysicalUnit =
  (typeof IRONBLOOM_PHYSICAL_UNIT)[keyof typeof IRONBLOOM_PHYSICAL_UNIT];

export class InvalidIronbloomMetricError extends Error {
  readonly code = INVALID_IRONBLOOM_METRIC_HOURS_OR_MONETARY_ONLY;
  readonly httpStatus = 422;

  constructor(message = INVALID_IRONBLOOM_METRIC_HOURS_OR_MONETARY_ONLY) {
    super(message);
    this.name = "InvalidIronbloomMetricError";
  }
}

const monetaryFieldKeys = new Set([
  "usd",
  "usdCents",
  "expenseUsd",
  "expense_usd",
  "monetaryValue",
  "monetary_value",
  "monetaryValueCents",
  "mitigatedValueCents",
  "amountUsd",
  "amount_usd",
  "currency",
]);

const positiveNumber = z.coerce.number().finite().positive();

export const ironbloomIngressSchema = z
  .object({
    assetId: z.string().trim().min(1).optional(),
    tenantId: z.string().uuid().optional(),
    zone: z.string().trim().min(1).optional(),
    fuelCategory: z.enum(["diesel", "gasoline", "natural_gas", "generic"]).optional(),
    kwh: positiveNumber.optional(),
    units_kwh: positiveNumber.optional(),
    unitsKwh: positiveNumber.optional(),
    liters: positiveNumber.optional(),
    L: positiveNumber.optional(),
    km: positiveNumber.optional(),
    physicalUnits: z
      .object({
        kwh: positiveNumber.optional(),
        liters: positiveNumber.optional(),
        km: positiveNumber.optional(),
      })
      .optional(),
    usd: positiveNumber.optional(),
    usdCents: positiveNumber.optional(),
    expenseUsd: positiveNumber.optional(),
    expense_usd: positiveNumber.optional(),
    monetaryValue: positiveNumber.optional(),
    monetary_value: positiveNumber.optional(),
    monetaryValueCents: z.union([positiveNumber, z.string()]).optional(),
    mitigatedValueCents: z.union([positiveNumber, z.string(), z.bigint()]).optional(),
    amountUsd: positiveNumber.optional(),
    amount_usd: positiveNumber.optional(),
    currency: z.string().optional(),
    telemetryText: z.string().optional(),
  })
  .passthrough();

export type IronbloomIngressPayload = z.infer<typeof ironbloomIngressSchema>;

export type ParsedTelemetryLine = {
  quantity: number;
  unit: IronbloomPhysicalUnit;
  fuelCategory?: FuelCategory;
};

export type FuelCategory = "diesel" | "gasoline" | "natural_gas" | "generic";

/** gCO₂e per liter by fuel category (IPCC-style density coefficients). */
export const FUEL_DENSITY_GCO2_PER_LITER: Record<FuelCategory, number> = {
  diesel: 2640,
  gasoline: 2310,
  natural_gas: 1850,
  generic: 2400,
};

/** Fleet / logistics distance coefficient (gCO₂e per km). */
export const LOGISTICS_GCO2_PER_KM = 120;

const TELEMETRY_LINE_RE =
  /(\d+(?:\.\d+)?)\s*(kWh|km)\b|(\d+(?:\.\d+)?)\s*L(?:\s+(diesel|gasoline|natural_gas))?/gi;

function objectHasMonetaryProxy(o: Record<string, unknown>): boolean {
  for (const key of Object.keys(o)) {
    if (monetaryFieldKeys.has(key)) return true;
    if (/[\u0024\u00A2\u00A3\u20AC\u00A5\uFFE5]/.test(key)) return true;
  }
  const raw = JSON.stringify(o);
  return /[\u0024\u00A2\u00A3\u20AC\u00A5\uFFE5]/.test(raw);
}

function extractPhysicalQuantities(o: Record<string, unknown>): {
  kwh: number;
  liters: number;
  km: number;
  fuelCategory?: FuelCategory;
} {
  const nested =
    o.physicalUnits != null && typeof o.physicalUnits === "object" && !Array.isArray(o.physicalUnits)
      ? (o.physicalUnits as Record<string, unknown>)
      : {};

  let kwh = Number(o.kwh ?? o.units_kwh ?? o.unitsKwh ?? nested.kwh ?? 0);
  let liters = Number(o.liters ?? o.L ?? nested.liters ?? 0);
  let km = Number(o.km ?? nested.km ?? 0);
  let fuelCategory = (o.fuelCategory as FuelCategory | undefined) ?? undefined;

  const telemetryText = typeof o.telemetryText === "string" ? o.telemetryText : "";
  if (telemetryText.trim()) {
    for (const line of parseUtilityTelemetryDrop(telemetryText)) {
      if (line.unit === IRONBLOOM_PHYSICAL_UNIT.KWH) kwh += line.quantity;
      if (line.unit === IRONBLOOM_PHYSICAL_UNIT.LITERS) {
        liters += line.quantity;
        fuelCategory = line.fuelCategory ?? fuelCategory;
      }
      if (line.unit === IRONBLOOM_PHYSICAL_UNIT.KM) km += line.quantity;
    }
  }

  return { kwh, liters, km, fuelCategory };
}

function hasAnyPhysicalQuantity(quantities: { kwh: number; liters: number; km: number }): boolean {
  return quantities.kwh > 0 || quantities.liters > 0 || quantities.km > 0;
}

/**
 * Parse utility file text drops (`5000 kWh`, `120 L diesel`, `45 km`) into physical rows.
 */
export function parseUtilityTelemetryDrop(text: string): ParsedTelemetryLine[] {
  const lines: ParsedTelemetryLine[] = [];
  if (!text.trim()) return lines;

  for (const match of text.matchAll(TELEMETRY_LINE_RE)) {
    if (match[1] && match[2]) {
      const unit = match[2].toLowerCase() === "km" ? IRONBLOOM_PHYSICAL_UNIT.KM : IRONBLOOM_PHYSICAL_UNIT.KWH;
      lines.push({ quantity: Number(match[1]), unit });
      continue;
    }
    if (match[3]) {
      const category = (match[4]?.toLowerCase() as FuelCategory | undefined) ?? "generic";
      lines.push({
        quantity: Number(match[3]),
        unit: IRONBLOOM_PHYSICAL_UNIT.LITERS,
        fuelCategory: category,
      });
    }
  }

  return lines;
}

/**
 * Zod-backed ingress gate — accepts kWh, L, or km; rejects monetary-only payloads.
 */
export function validateIronbloomIngress(body: unknown): IronbloomIngressPayload & {
  physical: { kwh: number; liters: number; km: number; fuelCategory?: FuelCategory };
} {
  const parsed = ironbloomIngressSchema.safeParse(body);
  if (!parsed.success) {
    throw new InvalidIronbloomMetricError(
      `${INVALID_IRONBLOOM_METRIC_HOURS_OR_MONETARY_ONLY}: ${parsed.error.issues[0]?.message ?? "invalid payload"}`,
    );
  }

  const o = parsed.data as Record<string, unknown>;
  const physical = extractPhysicalQuantities(o);
  const hasPhysical = hasAnyPhysicalQuantity(physical);
  const hasMonetary = objectHasMonetaryProxy(o);

  if (hasMonetary && !hasPhysical) {
    throw new InvalidIronbloomMetricError();
  }

  if (!hasPhysical) {
    const raw = JSON.stringify(body);
    const textMatch = /\b\d+(?:\.\d+)?\s*(?:kWh|km)\b|\b\d+(?:\.\d+)?\s*L\b/i.test(raw);
    if (!textMatch) {
      throw new InvalidIronbloomMetricError(
        `${INVALID_IRONBLOOM_METRIC_HOURS_OR_MONETARY_ONLY}: physical unit required (kWh, L, or km).`,
      );
    }
  }

  return { ...parsed.data, physical };
}

export function resolveRegionalGridIntensityGco2PerKwh(
  zoneHint: string | null | undefined,
  tenantKey?: TenantKey | null,
): number {
  if (tenantKey) {
    return getDefaultCarbonIntensityGco2ForTenant(tenantKey);
  }
  const zone = normalizeElectricityMapsZone(zoneHint, null);
  const fromZone = (
    Object.entries(TENANT_ELECTRICITY_MAP_ZONES) as Array<[TenantKey, string]>
  ).find(([, mapped]) => mapped === zone)?.[0];
  if (fromZone) {
    return getDefaultCarbonIntensityGco2ForTenant(fromZone);
  }
  return getDefaultCarbonIntensityGco2ForTenant("gridcore");
}

export type CarbonTraceRecord = {
  tenantId: string;
  assetId: string;
  physicalUnit: IronbloomPhysicalUnit;
  physicalQuantity: number;
  carbonGramsCo2e: bigint;
  gridIntensityGco2PerKwh?: number;
  fuelCategory?: FuelCategory;
  zone?: string;
  source: "regional_grid" | "fuel_density" | "logistics_distance";
  serializedTrace: string;
};

function gramsFromKwh(kwh: number, intensityGco2PerKwh: number): bigint {
  if (kwh <= 0 || intensityGco2PerKwh <= 0) return 0n;
  return BigInt(Math.round(kwh * intensityGco2PerKwh));
}

function gramsFromLiters(liters: number, fuelCategory: FuelCategory): bigint {
  if (liters <= 0) return 0n;
  return BigInt(Math.round(liters * FUEL_DENSITY_GCO2_PER_LITER[fuelCategory]));
}

function gramsFromKm(km: number): bigint {
  if (km <= 0) return 0n;
  return BigInt(Math.round(km * LOGISTICS_GCO2_PER_KM));
}

/**
 * Normalize validated physical telemetry into tenant-scoped carbon trace records.
 * Replaces static OSINT / Electricity Maps forensic placeholders for ingress math.
 */
export function normalizeIronbloomTelemetry(input: {
  tenantId: string;
  assetId?: string;
  payload: IronbloomIngressPayload & {
    physical: { kwh: number; liters: number; km: number; fuelCategory?: FuelCategory };
  };
  zone?: string;
  tenantKey?: TenantKey | null;
}): CarbonTraceRecord {
  const assetId = input.assetId?.trim() || input.payload.assetId?.trim() || "IRONBLOOM_INGEST";
  const { kwh, liters, km, fuelCategory } = input.payload.physical;
  const zone = normalizeElectricityMapsZone(input.zone ?? input.payload.zone, input.tenantKey ?? null);

  if (kwh > 0) {
    const gridIntensityGco2PerKwh = resolveRegionalGridIntensityGco2PerKwh(zone, input.tenantKey ?? null);
    const carbonGramsCo2e = gramsFromKwh(kwh, gridIntensityGco2PerKwh);
    const serializedTrace = JSON.stringify({
      tenantId: input.tenantId,
      assetId,
      physicalUnit: IRONBLOOM_PHYSICAL_UNIT.KWH,
      physicalQuantity: kwh,
      gridIntensityGco2PerKwh,
      carbonGramsCo2e: carbonGramsCo2e.toString(),
      zone,
      source: "regional_grid",
    });
    return {
      tenantId: input.tenantId,
      assetId,
      physicalUnit: IRONBLOOM_PHYSICAL_UNIT.KWH,
      physicalQuantity: kwh,
      carbonGramsCo2e,
      gridIntensityGco2PerKwh,
      zone,
      source: "regional_grid",
      serializedTrace,
    };
  }

  if (liters > 0) {
    const category = fuelCategory ?? input.payload.fuelCategory ?? "generic";
    const carbonGramsCo2e = gramsFromLiters(liters, category);
    const serializedTrace = JSON.stringify({
      tenantId: input.tenantId,
      assetId,
      physicalUnit: IRONBLOOM_PHYSICAL_UNIT.LITERS,
      physicalQuantity: liters,
      fuelCategory: category,
      carbonGramsCo2e: carbonGramsCo2e.toString(),
      source: "fuel_density",
    });
    return {
      tenantId: input.tenantId,
      assetId,
      physicalUnit: IRONBLOOM_PHYSICAL_UNIT.LITERS,
      physicalQuantity: liters,
      carbonGramsCo2e,
      fuelCategory: category,
      source: "fuel_density",
      serializedTrace,
    };
  }

  if (km > 0) {
    const carbonGramsCo2e = gramsFromKm(km);
    const serializedTrace = JSON.stringify({
      tenantId: input.tenantId,
      assetId,
      physicalUnit: IRONBLOOM_PHYSICAL_UNIT.KM,
      physicalQuantity: km,
      carbonGramsCo2e: carbonGramsCo2e.toString(),
      source: "logistics_distance",
    });
    return {
      tenantId: input.tenantId,
      assetId,
      physicalUnit: IRONBLOOM_PHYSICAL_UNIT.KM,
      physicalQuantity: km,
      carbonGramsCo2e,
      source: "logistics_distance",
      serializedTrace,
    };
  }

  throw new InvalidIronbloomMetricError();
}

/** Audited carbon trace — always includes tenantId for multi-tenant boundary isolation. */
export function logIronbloomCarbonTrace(trace: CarbonTraceRecord): void {
  console.info("[ironbloom-carbon-trace]", trace.serializedTrace);
}

export function computeIronbloomCarbonTrace(input: {
  tenantId: string;
  body: unknown;
  tenantKey?: TenantKey | null;
}): CarbonTraceRecord {
  const validated = validateIronbloomIngress(input.body);
  const trace = normalizeIronbloomTelemetry({
    tenantId: input.tenantId,
    assetId: validated.assetId,
    payload: validated,
    zone: validated.zone,
    tenantKey: input.tenantKey ?? null,
  });
  logIronbloomCarbonTrace(trace);
  return trace;
}
