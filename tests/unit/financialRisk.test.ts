import { describe, expect, it } from "vitest";
import {
  computeCostOfNonCompliance,
  GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS,
  GOVERNANCE_LIABILITY_RATIO,
  GOVERNANCE_MATURITY_DISCOUNT_CAP,
  resolveGovernanceTotalAssetsUsd,
} from "@/app/utils/financialRisk";

describe("financialRisk", () => {
  it("uses tenant ALE cents for Medshield baseline", () => {
    const baseline = resolveGovernanceTotalAssetsUsd({ tenantKey: "medshield" });
    expect(baseline.totalBaselineUsd).toBe(11_100_000);
    expect(baseline.baselineMode).toBe("tenant_ale");
  });

  it("uses 1.6B governance envelope when requested", () => {
    const baseline = resolveGovernanceTotalAssetsUsd({ baselineMode: "governance_envelope" });
    expect(baseline.totalBaselineUsd).toBe(GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS * 1_000_000_000);
  });

  it("accepts dynamic baseline cents override", () => {
    const baseline = resolveGovernanceTotalAssetsUsd({
      tenantKey: "medshield",
      baselineCents: 1_500_000_000n,
    });
    expect(baseline.totalBaselineUsd).toBe(15_000_000);
  });

  it("at maturity 1 carries full 3% liability", () => {
    const r = computeCostOfNonCompliance(1, {
      baselineMode: "governance_envelope",
    });
    const expectedMax = GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS * 1e9 * GOVERNANCE_LIABILITY_RATIO;
    expect(r.probabilisticLiabilityUsd).toBeCloseTo(expectedMax, 0);
    expect(r.governanceDividendUsd).toBeCloseTo(0, 0);
    expect(r.maturityDiscountFactor).toBe(0);
  });

  it("at maturity 10 discounts liability by 95%", () => {
    const r = computeCostOfNonCompliance(10, {
      baselineMode: "governance_envelope",
    });
    const expectedMax = GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS * 1e9 * GOVERNANCE_LIABILITY_RATIO;
    expect(r.probabilisticLiabilityUsd).toBeCloseTo(
      expectedMax * (1 - GOVERNANCE_MATURITY_DISCOUNT_CAP),
      0,
    );
    expect(r.governanceDividendUsd).toBeCloseTo(
      expectedMax * GOVERNANCE_MATURITY_DISCOUNT_CAP,
      0,
    );
  });

  it("governance dividend increases with maturity score", () => {
    const low = computeCostOfNonCompliance(3, { tenantKey: "vaultbank" });
    const high = computeCostOfNonCompliance(8, { tenantKey: "vaultbank" });
    expect(high.governanceDividendUsd).toBeGreaterThan(low.governanceDividendUsd);
    expect(high.probabilisticLiabilityUsd).toBeLessThan(low.probabilisticLiabilityUsd);
  });

  it("includes sustainability ALE and carbon avoidance in combined dividend", () => {
    const r = computeCostOfNonCompliance(8, {
      tenantKey: "medshield",
      sustainabilityAleCents: 50_000n,
      carbonPenaltyAvoidedCents: 25_000n,
    });
    expect(r.sustainabilityAleCents).toBe("50000");
    expect(r.carbonPenaltyAvoidedCents).toBe("25000");
    expect(BigInt(r.combinedGovernanceDividendDisplay.replace(/\D/g, "") || "0")).toBeGreaterThan(0n);
  });
});
