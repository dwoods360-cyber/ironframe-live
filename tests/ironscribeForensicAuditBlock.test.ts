import { describe, it, expect } from "vitest";
import {
  buildIronscribeForensicAuditMarkdown,
  formatUsdFromSealedCents,
} from "@/app/services/ironscribe/forensicAuditBlock";

describe("Ironscribe forensic audit block (Agent 5)", () => {
  it("formats USD from sealed BigInt cents without float drift", () => {
    expect(formatUsdFromSealedCents("1110000000")).toBe("11100000.00");
    expect(formatUsdFromSealedCents("850")).toBe("8.50");
  });

  it("emits immutable markdown with custody and compliance sections", () => {
    const md = buildIronscribeForensicAuditMarkdown({
      threatId: "threat-abc",
      tenantId: "tenant-xyz",
      financialImpactCents: "850",
      auditTimestamp: "2026-05-18T12:00:00.000Z",
      historyLogs: [
        {
          agentId: "Irongate (Agent 14)",
          timestamp: "2026-05-18T11:59:00.000Z",
          message: "Tenant stamped.",
        },
      ],
      complianceBadges: ["ESRS E1-6"],
    });

    expect(md).toContain("# FORENSIC AUDIT TRAIL");
    expect(md).toContain("`threat-abc`");
    expect(md).toContain("$8.50");
    expect(md).toContain("FORCE-WIDE CHAIN OF CUSTODY");
    expect(md).toContain("ESRS E1-6");
    expect(md).toContain("Ironscribe (Agent 5)");
  });

  it("falls back to baseline compliance when no badges", () => {
    const md = buildIronscribeForensicAuditMarkdown({
      threatId: "t1",
      tenantId: "u1",
      financialImpactCents: "0",
      historyLogs: [],
      complianceBadges: [],
    });
    expect(md).toContain("Baseline Structural Integrity Guard");
  });
});
