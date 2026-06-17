import { describe, expect, it } from "vitest";

import {
  buildBoardFinancialDisplay,
  formatCentsToMacroUsd,
  formatCentsToPreciseUsd,
} from "@/app/lib/board/boardFinancialDisplay";
import { BOARD_ALE_BASELINES_CENTS } from "@/app/lib/board/sharedBoardContext";

describe("boardFinancialDisplay", () => {
  it("formats sovereign baselines as macro USD", () => {
    expect(formatCentsToMacroUsd(590000000n)).toBe("$5.9M USD");
    expect(formatCentsToMacroUsd(1110000000n)).toBe("$11.1M USD");
  });

  it("formats live exposure as precise USD with cents", () => {
    expect(formatCentsToPreciseUsd(9650000n)).toBe("$96,500.00 USD");
    expect(formatCentsToPreciseUsd(15400000n)).toBe("$154,000.00 USD");
  });

  it("builds per-entity sovereign pool display contract", () => {
    const display = buildBoardFinancialDisplay({
      baselines: {
        medshield: BOARD_ALE_BASELINES_CENTS.medshield,
        vaultbank: BOARD_ALE_BASELINES_CENTS.vaultbank,
        gridcore: BOARD_ALE_BASELINES_CENTS.gridcore,
      },
      activeTenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
      activeTenantSlug: "medshield",
      activeTenantName: "Medshield",
      activeExposureCents: 9650000n,
      poolExposureBySlug: {
        medshield: 9650000n,
        vaultbank: 15400000n,
        gridcore: 0n,
      },
      powerUsageKwh: 1200000n,
      fluidConsumptionLiters: 45000n,
      doraCompletionPercentage: 100,
      doraStatus: "COMPLIANT",
    });

    expect(display.sovereignPool.vaultbank.baselineFormatted).toBe("$5.9M USD");
    expect(display.sovereignPool.vaultbank.currentExposureFormatted).toBe("$154,000.00 USD");
    expect(display.compliance.doraReadinessFormatted).toBe("100%");
    expect(display.governanceTriadScaffold.exposureHeading).toBe("I. Exposure Vector");
  });
});
