/**
 * Ironbloom / Epic 9 physical-unit gate — not a Server Action module (safe to import from API routes & actions).
 */

import {
  INVALID_IRONBLOOM_METRIC_HOURS_OR_MONETARY_ONLY,
  InvalidIronbloomMetricError,
  validateIronbloomIngress,
} from "@/lib/sustainability/ironbloom";

export {
  INVALID_IRONBLOOM_METRIC_HOURS_OR_MONETARY_ONLY,
  InvalidIronbloomMetricError,
} from "@/lib/sustainability/ironbloom";

/** Reject monetary-only “offsets” (currency symbols). */
export const IRONBLOOM_CURRENCY_SYMBOL_RE = /[\u0024\u00A2\u00A3\u20AC\u00A5\uFFE5]/;

/** At least one constitutional physical unit (kWh, L, or km). */
export const IRONBLOOM_ANY_PHYSICAL_UNIT_RE = /\bkWh\b|\bkm\b|\b\d+(?:\.\d+)?\s*L\b/i;

/**
 * Epic 9 **Physical Only**: payload must simultaneously evidence **kWh**, **liters (L)**, and **CO2e**
 * in the serialized inspection text (concatenation-safe lookaheads).
 *
 * - Energy: `kWh` / `KWH`
 * - Mass / GHG: `CO2e` or `CO₂e`
 * - Volume: numeric liters `123 L` or `12.5 L` (avoids bare letter false positives)
 */
export const IRONBLOOM_PHYSICAL_UNITS_RE =
  /(?=[\s\S]*\bkWh\b)(?=[\s\S]*(?:\bCO2e\b|\bCO₂e\b))(?=[\s\S]*(?:\d+(?:\.\d+)?\s*L\b))/i;

export function ironbloomRejectionMessage(assetId: string): string {
  return `IRONBLOOM REJECTION: Monetary-only data is forbidden. Provide kWh, L, or km for [${assetId}].`;
}

export class IronbloomIngestUnprocessableError extends Error {
  readonly httpStatus = 422;
  constructor(message: string) {
    super(message);
    this.name = "IronbloomIngestUnprocessableError";
  }
}

/** ESG route guard — monetary proxy without physical units. */
export class PhysicalUnitRequiredError extends Error {
  readonly code = "PHYSICAL_UNIT_REQUIRED" as const;
  readonly httpStatus = 400;
  constructor() {
    super("PHYSICAL_UNIT_REQUIRED");
    this.name = "PhysicalUnitRequiredError";
  }
}

function hasStructuredPhysicalUnits(o: Record<string, unknown>): boolean {
  if (o.physicalUnits != null && typeof o.physicalUnits === "object") {
    const pu = o.physicalUnits as Record<string, unknown>;
    if (Number(pu.kwh) > 0 || Number(pu.liters) > 0 || Number(pu.km) > 0) return true;
  }
  return (
    (o.kwh != null && Number(o.kwh) > 0) ||
    (o.liters != null && Number(o.liters) > 0) ||
    (o.km != null && Number(o.km) > 0) ||
    (o.units_kwh != null && Number(o.units_kwh) > 0)
  );
}

function hasMonetaryProxy(o: Record<string, unknown>): boolean {
  return (
    o.monetaryValue != null ||
    o.monetary_value != null ||
    o.monetaryValueCents != null ||
    o.mitigatedValueCents != null
  );
}

/**
 * Ironbloom ESG ingestion: reject monetary-only payloads (HTTP 400).
 */
export function assertEsgPhysicalIngestion(body: unknown): void {
  try {
    validateIronbloomIngress(body);
  } catch (error) {
    if (error instanceof InvalidIronbloomMetricError) {
      throw error;
    }
    throw new PhysicalUnitRequiredError();
  }
}

/** Orchestration / Agent 18 hard block — missing mandatory physical units. */
export class IronbloomCriticalIngestionError extends Error {
  readonly code = "CRITICAL_INGESTION_FAILURE" as const;
  readonly httpStatus = 422;
  readonly assetId: string;

  constructor(assetId: string, detail?: string) {
    const base = ironbloomRejectionMessage(assetId);
    super(detail ? `${base} ${detail}` : base);
    this.name = "IronbloomCriticalIngestionError";
    this.assetId = assetId;
  }
}

/**
 * Strict gate: no currency tokens; payload must include **kWh**, **L** (liter quantities), and **CO2e**.
 */
export type IronbloomEsgEntryInput = {
  assetId: string;
  kwh?: number | bigint | null;
  liters?: number | null;
  km?: number | null;
  /** Monetary-only proxy — always rejected when no physical unit is present. */
  mitigatedValueCents?: bigint | number | string | null;
  payload?: unknown;
};

export function validateIronbloomEsgEntry(entry: IronbloomEsgEntryInput): void {
  const assetId = entry.assetId?.trim() || "UNKNOWN_ASSET";
  const hasPhysical =
    (entry.kwh != null && Number(entry.kwh) > 0) ||
    (entry.liters != null && entry.liters > 0) ||
    (entry.km != null && entry.km > 0);

  if (hasPhysical) return;

  const raw =
    entry.payload != null && typeof entry.payload === "object"
      ? JSON.stringify(entry.payload)
      : entry.payload != null
        ? String(entry.payload)
        : "";
  if (raw && IRONBLOOM_ANY_PHYSICAL_UNIT_RE.test(raw) && !IRONBLOOM_CURRENCY_SYMBOL_RE.test(raw)) {
    return;
  }

  throw new IronbloomIngestUnprocessableError(ironbloomRejectionMessage(assetId));
}

export function validateIronbloomSustainabilityPayload(payload: unknown, assetId = "ESG_INGEST"): void {
  validateIronbloomEsgEntry({ assetId, payload });
  const raw =
    typeof payload === "string"
      ? payload
      : payload != null && typeof payload === "object"
        ? JSON.stringify(payload)
        : String(payload);
  if (IRONBLOOM_CURRENCY_SYMBOL_RE.test(raw)) {
    throw new IronbloomIngestUnprocessableError(ironbloomRejectionMessage(assetId));
  }
  if (!IRONBLOOM_PHYSICAL_UNITS_RE.test(raw)) {
    throw new IronbloomIngestUnprocessableError(
      "Ironbloom ingestion rejected: payload must include physical units kWh, liters (L), and CO2e.",
    );
  }
}
