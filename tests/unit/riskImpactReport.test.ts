import { describe, expect, it } from "vitest";

import {
  generatePostureDowngradeRiskImpactReport,
  POSTURE_DOWNGRADE_ALE_MULTIPLIER,
} from "@/app/lib/riskImpactReport";

describe("generatePostureDowngradeRiskImpactReport", () => {
  it("applies 1.4x multiplier to constitutional baselines", () => {
    const report = generatePostureDowngradeRiskImpactReport();
    expect(report.multiplier).toBe(POSTURE_DOWNGRADE_ALE_MULTIPLIER);
    const med = report.rows.find((r) => r.assetKey === "medshield");
    expect(med?.currentAleDisplay).toBe("$11.10M");
    expect(med?.newAleDisplay).toBe("$15.54M");
    expect(med?.increaseDisplay).toBe("+$4.44M");
  });
});
