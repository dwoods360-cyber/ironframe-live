import { describe, expect, it } from "vitest";

import { buildBoardFinancialDisplay } from "@/app/lib/board/boardFinancialDisplay";
import {
  BOARD_ALE_BASELINES_CENTS,
  serializeBoardContextPayload,
  type BoardContextPayload,
} from "@/app/lib/board/sharedBoardContext";

describe("sharedBoardContext", () => {
  it("preserves immutable ALE baseline cents", () => {
    expect(BOARD_ALE_BASELINES_CENTS.medshield).toBe(1110000000n);
    expect(BOARD_ALE_BASELINES_CENTS.vaultbank).toBe(590000000n);
    expect(BOARD_ALE_BASELINES_CENTS.gridcore).toBe(470000000n);
  });

  it("serializes BigInt fields as strings without float coercion", () => {
    const display = buildBoardFinancialDisplay({
      baselines: {
        medshield: BOARD_ALE_BASELINES_CENTS.medshield,
        vaultbank: BOARD_ALE_BASELINES_CENTS.vaultbank,
        gridcore: BOARD_ALE_BASELINES_CENTS.gridcore,
      },
      activeTenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
      activeTenantSlug: "medshield",
      activeTenantName: "Medshield",
      activeExposureCents: 1110000000n,
      poolExposureBySlug: {
        medshield: 1110000000n,
        vaultbank: 590000000n,
        gridcore: 470000000n,
      },
      powerUsageKwh: 15000n,
      fluidConsumptionLiters: 3200n,
      doraCompletionPercentage: 42,
      doraStatus: "NON_COMPLIANT",
    });

    const payload: BoardContextPayload = {
      tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
      timestamp: "2026-06-16T12:00:00.000Z",
      systemStatus: "ARCHITECTURE ENFORCED",
      financials: {
        baselines: BOARD_ALE_BASELINES_CENTS,
        currentExposureCents: 1110000000n,
        display,
      },
      technical: {
        criticalThreatCount: 1,
        activeVulnerabilities: [
          {
            id: "threat-1",
            cveId: "CVE-2026-0001",
            description: "Critical vendor chain exposure",
            blastRadiusCents: 250000000n,
          },
        ],
      },
      compliance: {
        frameworks: [
          {
            name: "DORA",
            status: "NON_COMPLIANT",
            completionPercentage: 42,
          },
        ],
      },
      sustainability: {
        powerUsageKwh: 15000n,
        fluidConsumptionLiters: 3200n,
      },
    };

    const json = serializeBoardContextPayload(payload);
    const parsed = JSON.parse(json) as {
      financials: { currentExposureCents: string; baselines: { medshield: string } };
      technical: { activeVulnerabilities: Array<{ blastRadiusCents: string }> };
      sustainability: { powerUsageKwh: string };
    };

    expect(parsed.financials.currentExposureCents).toBe("1110000000");
    expect(parsed.financials.baselines.medshield).toBe("1110000000");
    expect(parsed.financials.display.sovereignPool.vaultbank.baselineFormatted).toBe("$5.9M USD");
    expect(parsed.technical.activeVulnerabilities[0]?.blastRadiusCents).toBe("250000000");
    expect(parsed.sustainability.powerUsageKwh).toBe("15000");
    expect(json).not.toContain("1110000000.0");
  });
});
