import { describe, expect, it } from "vitest";

import { buildIrontallyAuditMatrixCsv } from "@/app/utils/irontallyAuditMatrixCsv";
import type { FrameworkReadinessSummary } from "@/app/types/irontallyReadiness";

describe("buildIrontallyAuditMatrixCsv", () => {
  it("emits required headers and framework summary rows", () => {
    const readiness: FrameworkReadinessSummary[] = [
      {
        framework: "SOC2",
        totalControlsMonitored: 5,
        passingControlsCount: 1,
        verifiedEvidenceLogs: [
          {
            controlId: "CC6.1 — Logical access security",
            agentSignature: "iq-abc",
            timestamp: "2026-05-21T12:00:00.000Z",
            physicalContext: "Ledger attestation (ORCHESTRATION_BUS_CYCLE_SUCCESS): bus ok.",
          },
        ],
      },
    ];

    const csv = buildIrontallyAuditMatrixCsv({
      tenantName: "Medshield",
      tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
      asOf: "2026-05-21T15:00:00.000Z",
      readiness,
    });

    expect(csv).toContain("Framework,Control ID,Status,Evidence Action,Last Verified Timestamp");
    expect(csv).toContain("SOC2,FRAMEWORK_SUMMARY,1/5 PASSING");
    expect(csv).toContain("CC6.1 — Logical access security,VERIFIED,ORCHESTRATION_BUS_CYCLE_SUCCESS");
  });
});
