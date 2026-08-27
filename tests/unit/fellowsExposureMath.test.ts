import { describe, expect, it } from "vitest";

import {
  computeExposureBounds,
  estimatedExposureCents,
} from "@/app/lib/fellows/exposureMath";

describe("fellows exposureMath", () => {
  it("computes whole-cent estimated exposure with integer ARO milli", () => {
    // $10,000.00 SLE × 0.5/yr → 500_000 cents
    expect(estimatedExposureCents(1_000_000n, 500n)).toBe(500_000n);
  });

  it("floors fractional cents from integer division", () => {
    // 101 cents × 1 milli (0.001/yr) → 0 cents (floor)
    expect(estimatedExposureCents(101n, 1n)).toBe(0n);
    expect(estimatedExposureCents(2000n, 1n)).toBe(2n);
  });

  it("computes min/max bounds without floats", () => {
    const result = computeExposureBounds({
      sleMinCents: 250_000_00n,
      sleMaxCents: 1_200_000_00n,
      aroMinMilli: 250n,
      aroMaxMilli: 1000n,
    });
    expect(result.estimatedExposureMinCents).toBe(62_500_00n);
    expect(result.estimatedExposureMaxCents).toBe(1_200_000_00n);
    expect(result.claimHygiene).toBe("estimated_exposure");
  });
});
