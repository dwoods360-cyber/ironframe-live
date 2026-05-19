import { describe, expect, it } from "vitest";
import {
  buildRateSealDigest,
  computeRateDriftRatio,
  convertToCents,
} from "@/app/utils/ironbloomPhysicalToFinancial";
import {
  computeMitigatedValueInSealedNode,
  sealUtilityRateQuote,
} from "@/app/services/ironbloom/sealedRateNode";
import {
  ironbloomRejectionMessage,
  validateIronbloomEsgEntry,
} from "@/lib/sustainability/constants";
import { IronbloomIngestUnprocessableError } from "@/lib/sustainability/constants";

describe("ironbloomRateEngine", () => {
  it("convertToCents multiplies physical units by USD rate", () => {
    expect(convertToCents(1000, "kWh", 0.12)).toBe(12000n);
    expect(convertToCents(50, "L", 0.04)).toBe(200n);
    expect(convertToCents(120, "km", 0.55)).toBe(6600n);
  });

  it("sealed node rejects tampered rate digest", () => {
    const quote = {
      rateUsdPerUnit: 0.11,
      unitType: "kWh" as const,
      source: "dev-fallback" as const,
      jurisdiction: "USA:80202",
      polledAt: "2026-05-15T00:00:00.000Z",
    };
    const sealed = sealUtilityRateQuote(quote);
    const tampered = { ...sealed, rateUsdPerUnit: 0.99 };
    expect(() =>
      computeMitigatedValueInSealedNode({ physicalUnits: 500, sealedRate: tampered }),
    ).toThrow(/SEALED NODE/i);
  });

  it("sealed node writes mitigatedValueCents as BigInt", () => {
    const quote = {
      rateUsdPerUnit: 0.1,
      unitType: "kWh" as const,
      source: "dev-fallback" as const,
      jurisdiction: "USA:80202",
      polledAt: "2026-05-15T00:00:00.000Z",
    };
    const sealed = sealUtilityRateQuote(quote);
    const result = computeMitigatedValueInSealedNode({ physicalUnits: 2500, sealedRate: sealed });
    expect(result.mitigatedValueCents).toBe(25000n);
    expect(buildRateSealDigest(quote)).toBe(sealed.sealDigest);
  });

  it("flags >15% utility drift", () => {
    expect(computeRateDriftRatio(0.1, 0.12)).toBeCloseTo(0.2, 5);
    expect(computeRateDriftRatio(0.1, 0.105)).toBeCloseTo(0.05, 5);
  });

  it("rejects monetary-only ESG with mandated copy", () => {
    const assetId = "gc-scada-terminal";
    expect(ironbloomRejectionMessage(assetId)).toBe(
      "IRONBLOOM REJECTION: Monetary-only data is forbidden. Provide kWh, L, or km for [gc-scada-terminal].",
    );
    expect(() =>
      validateIronbloomEsgEntry({ assetId, mitigatedValueCents: 50000n }),
    ).toThrow(IronbloomIngestUnprocessableError);
    expect(() => validateIronbloomEsgEntry({ assetId, kwh: 100 })).not.toThrow();
  });
});
