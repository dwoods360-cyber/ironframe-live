/**
 * Ironbloom / Epic 9 physical-unit gate — not a Server Action module (safe to import from API routes & actions).
 */

/** Reject monetary-only “offsets” (currency symbols). */
export const IRONBLOOM_CURRENCY_SYMBOL_RE = /[\u0024\u00A2\u00A3\u20AC\u00A5\uFFE5]/;

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

export class IronbloomIngestUnprocessableError extends Error {
  readonly httpStatus = 422;
  constructor(message: string) {
    super(message);
    this.name = "IronbloomIngestUnprocessableError";
  }
}

/**
 * Strict gate: no currency tokens; payload must include **kWh**, **L** (liter quantities), and **CO2e**.
 */
export function validateIronbloomSustainabilityPayload(payload: unknown): void {
  const raw =
    typeof payload === "string"
      ? payload
      : payload != null && typeof payload === "object"
        ? JSON.stringify(payload)
        : String(payload);
  if (IRONBLOOM_CURRENCY_SYMBOL_RE.test(raw)) {
    throw new IronbloomIngestUnprocessableError(
      "Ironbloom ingestion rejected: currency symbols are forbidden (monetary-only offsets not accepted).",
    );
  }
  if (!IRONBLOOM_PHYSICAL_UNITS_RE.test(raw)) {
    throw new IronbloomIngestUnprocessableError(
      "Ironbloom ingestion rejected: payload must include physical units kWh, liters (L), and CO2e.",
    );
  }
}
