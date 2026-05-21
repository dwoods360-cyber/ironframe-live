import { createHash } from "crypto";
import type { PhysicalUnitType, UtilityRateQuote } from "@/app/types/ironbloomGridcore";

/**
 * Physical-to-financial conversion (Gridcore sealed node uses this exclusively).
 */
export function convertToCents(
  units: number,
  unitType: PhysicalUnitType,
  rate: number,
): bigint {
  if (!Number.isFinite(units) || units < 0) {
    throw new Error(`IRONBLOOM: invalid physical units for ${unitType}.`);
  }
  if (!Number.isFinite(rate) || rate < 0) {
    throw new Error("IRONBLOOM: utility rate must be a non-negative finite number.");
  }
  const safeUnits = unitType === "kWh" ? Math.round(units) : units;
  const usd = safeUnits * rate;
  return BigInt(Math.round(usd * 100));
}

export function buildRateSealDigest(quote: UtilityRateQuote): string {
  const canonical = `${quote.jurisdiction}|${quote.unitType}|${quote.rateUsdPerUnit}|${quote.source}|${quote.polledAt}`;
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function computeRateDriftRatio(previousUsd: number, nextUsd: number): number {
  if (previousUsd <= 0) return 0;
  return Math.abs(nextUsd - previousUsd) / previousUsd;
}
