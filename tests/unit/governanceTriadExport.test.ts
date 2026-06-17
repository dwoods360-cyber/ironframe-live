import { describe, expect, it } from "vitest";

import { buildBoardFinancialDisplay } from "@/app/lib/board/boardFinancialDisplay";
import { BOARD_ALE_BASELINES_CENTS } from "@/app/lib/board/sharedBoardContext";
import {
  buildGovernanceTriadCsv,
  buildGovernanceTriadRows,
  formatCentsToMacroUsd,
  formatPhysicalKwh,
  sanitizeExportProse,
} from "@/app/lib/reports/governanceTriadSanitizer";
import type { BoardContextPayload } from "@/app/lib/board/sharedBoardContext";

function samplePayload(): BoardContextPayload {
  const display = buildBoardFinancialDisplay({
    baselines: {
      medshield: BOARD_ALE_BASELINES_CENTS.medshield,
      vaultbank: BOARD_ALE_BASELINES_CENTS.vaultbank,
      gridcore: BOARD_ALE_BASELINES_CENTS.gridcore,
    },
    activeTenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
    activeTenantSlug: "medshield",
    activeTenantName: "Medshield",
    activeExposureCents: 590000000n,
    poolExposureBySlug: {
      medshield: 590000000n,
      vaultbank: 590000000n,
      gridcore: 470000000n,
    },
    powerUsageKwh: 1200000n,
    fluidConsumptionLiters: 45000n,
    doraCompletionPercentage: 82,
    doraStatus: "NON_COMPLIANT",
  });

  return {
    tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
    timestamp: "2026-06-16T12:00:00.000Z",
    systemStatus: "ARCHITECTURE ENFORCED",
    financials: {
      baselines: BOARD_ALE_BASELINES_CENTS,
      currentExposureCents: 590000000n,
      display,
    },
    technical: {
      criticalThreatCount: 1,
      activeVulnerabilities: [
        {
          id: "threat-uuid-1",
          cveId: "CVE-2024-1234",
          description: "Unpatched edge relay",
          blastRadiusCents: 250000000n,
        },
      ],
    },
    compliance: {
      frameworks: [
        { name: "DORA", status: "NON_COMPLIANT", completionPercentage: 82 },
      ],
    },
    sustainability: {
      powerUsageKwh: 1200000n,
      fluidConsumptionLiters: 45000n,
    },
    narrativeCache: null,
  };
}

describe("governanceTriadSanitizer", () => {
  it("formats whole-cent baselines into macro USD strings", () => {
    expect(formatCentsToMacroUsd(590000000n)).toBe("$5.9M USD");
    expect(formatCentsToMacroUsd(1110000000n)).toBe("$11.1M USD");
    expect(formatCentsToMacroUsd(470000000n)).toBe("$4.7M USD");
  });

  it("preserves physical sustainability units", () => {
    expect(formatPhysicalKwh(1200000n)).toBe("1,200,000 kWh");
  });

  it("strips CVE identifiers from export prose", () => {
    const sanitized = sanitizeExportProse("Active CVE-2024-9999 on asset.");
    expect(sanitized).not.toContain("CVE-2024-9999");
    expect(sanitized).toContain("perimeter-classified threat");
  });

  it("builds triad CSV without raw CVE tokens", () => {
    const csv = buildGovernanceTriadCsv(samplePayload());
    expect(csv).toContain("Governance Triad Pillar");
    expect(csv).toContain("$5.9M USD");
    expect(csv).toContain("1,200,000 kWh");
    expect(csv).not.toMatch(/CVE-\d{4}-\d+/);
  });

  it("includes DORA readiness in remediation row", () => {
    const rows = buildGovernanceTriadRows(samplePayload());
    expect(rows[2]?.summary).toContain("82%");
    expect(rows[2]?.summary).toContain("Human-in-the-loop");
  });
});
