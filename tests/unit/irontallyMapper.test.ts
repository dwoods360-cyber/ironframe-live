import { describe, expect, it } from "vitest";
import {
  buildIrontallyFrameworkSnapshot,
  mapMaturityToIso27001Level,
  mapMaturityToNistCsfTier,
  mapMaturityToSoc2Type2,
} from "@/app/services/irontallyMapper";
import { runIrontallyShadowCertificationCheck as shadowCheck } from "@/app/services/irontallyShadowMode";

describe("irontallyMapper", () => {
  it("maps NIST Tier 1 for scores 1-3 and Tier 4 for 9-10", () => {
    expect(mapMaturityToNistCsfTier(2).tier).toBe(1);
    expect(mapMaturityToNistCsfTier(3).tier).toBe(1);
    expect(mapMaturityToNistCsfTier(9).tier).toBe(4);
    expect(mapMaturityToNistCsfTier(10).tier).toBe(4);
  });

  it("maps ISO Level 1 for 1-2 and Level 5 for 9-10", () => {
    expect(mapMaturityToIso27001Level(1).level).toBe(1);
    expect(mapMaturityToIso27001Level(2).level).toBe(1);
    expect(mapMaturityToIso27001Level(9).level).toBe(5);
    expect(mapMaturityToIso27001Level(10).level).toBe(5);
  });

  it("maps SOC2 bands per spec", () => {
    expect(mapMaturityToSoc2Type2(4).status).toBe("NON_COMPLIANT");
    expect(mapMaturityToSoc2Type2(5).status).toBe("COMPLIANT");
    expect(mapMaturityToSoc2Type2(8).status).toBe("COMPLIANT");
    expect(mapMaturityToSoc2Type2(9).status).toBe("HIGH_INTEGRITY_VERIFIED");
  });

  it("builds readiness statement with maturity score", () => {
    const snap = buildIrontallyFrameworkSnapshot(9.2);
    expect(snap.readinessStatement).toContain("9.2");
    expect(snap.readinessStatement).toContain("NIST CSF");
    expect(snap.market.resilienceSurplus).toBeGreaterThan(0);
  });
});

describe("irontallyShadowMode", () => {
  it("flags certification loss when score drops below SOC2 floor", () => {
    const result = shadowCheck({ scoreBefore: 6, scoreAfter: 4.2 });
    expect(result.wouldLoseCertification).toBe(true);
    expect(result.certificationLost.some((c) => c.framework === "SOC 2 Type II")).toBe(true);
  });

  it("reports stable when score remains compliant", () => {
    const result = shadowCheck({ scoreBefore: 8, scoreAfter: 7.5 });
    expect(result.shadowVerdict).toBe("STABLE");
    expect(result.wouldLoseCertification).toBe(false);
  });
});
