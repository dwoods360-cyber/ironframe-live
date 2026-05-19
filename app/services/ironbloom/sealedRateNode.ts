import "server-only";

import { createHash } from "crypto";
import type {
  PhysicalUnitType,
  SealedUtilityRateSnapshot,
  UtilityRateQuote,
} from "@/app/types/ironbloomGridcore";
import { buildRateSealDigest, convertToCents } from "@/app/utils/ironbloomPhysicalToFinancial";

export type SealedMitigationResult = {
  mitigatedValueCents: bigint;
  unitType: PhysicalUnitType;
  physicalUnits: number;
  rateUsdPerUnit: number;
  sealDigest: string;
  sealedAt: string;
};

/**
 * Freezes a polled utility quote into an immutable sealed snapshot.
 * Human operators cannot override `rateUsdPerUnit` after sealing.
 */
export function sealUtilityRateQuote(quote: UtilityRateQuote): SealedUtilityRateSnapshot {
  const sealDigest = buildRateSealDigest(quote);
  return Object.freeze({
    rateUsdPerUnit: quote.rateUsdPerUnit,
    unitType: quote.unitType,
    source: quote.source,
    jurisdiction: quote.jurisdiction,
    fetchedAt: quote.polledAt,
    sealDigest,
  });
}

function assertSealIntegrity(snapshot: SealedUtilityRateSnapshot): void {
  const expected = buildRateSealDigest({
    rateUsdPerUnit: snapshot.rateUsdPerUnit,
    unitType: snapshot.unitType,
    source: snapshot.source,
    jurisdiction: snapshot.jurisdiction,
    polledAt: snapshot.fetchedAt,
  });
  if (expected !== snapshot.sealDigest) {
    throw new Error("IRONBLOOM SEALED NODE: utility rate digest mismatch — tamper rejected.");
  }
}

/**
 * Sealed Node — physical units × frozen utility rate → `mitigatedValueCents` (BigInt).
 * No optional rate override parameter is accepted.
 */
export function computeMitigatedValueInSealedNode(params: {
  physicalUnits: number;
  sealedRate: SealedUtilityRateSnapshot;
}): SealedMitigationResult {
  assertSealIntegrity(params.sealedRate);
  const mitigatedValueCents = convertToCents(
    params.physicalUnits,
    params.sealedRate.unitType,
    params.sealedRate.rateUsdPerUnit,
  );
  const sealedAt = new Date().toISOString();
  const attestation = createHash("sha256")
    .update(
      `${params.sealedRate.sealDigest}|${params.physicalUnits}|${mitigatedValueCents.toString()}|${sealedAt}`,
      "utf8",
    )
    .digest("hex");

  return {
    mitigatedValueCents,
    unitType: params.sealedRate.unitType,
    physicalUnits: params.physicalUnits,
    rateUsdPerUnit: params.sealedRate.rateUsdPerUnit,
    sealDigest: attestation,
    sealedAt,
  };
}
