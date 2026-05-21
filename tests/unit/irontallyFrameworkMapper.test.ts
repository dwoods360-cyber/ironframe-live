import { describe, expect, it } from "vitest";
import {
  buildFrameworkComplianceMappingMarkdown,
  isIronguardBreachBlockedCode,
} from "@/src/services/irontally/frameworkMapper";

describe("irontally frameworkMapper", () => {
  it("maps known Ironguard breach codes", () => {
    expect(isIronguardBreachBlockedCode("CROSS_TENANT_API_BLOCKED")).toBe(true);
    expect(isIronguardBreachBlockedCode("MYSTERY")).toBe(false);
  });

  it("includes SOC2 CC6.3 and ISO Annex references in markdown table", () => {
    const md = buildFrameworkComplianceMappingMarkdown({
      windowStartIso: "2026-01-01T00:00:00.000Z",
      windowEndIso: "2026-01-02T00:00:00.000Z",
      tenantScopeChangeCount: 1,
      tenantScopeChangeEvidenceAuditLogId: "tenant-uuid|audit-cuid",
      ironguardBreachBlockedCount: 2,
      ironguardBreachBlockedEvidenceViolationId: "viol-1",
      stateFreezeTriggeredCount: 0,
      stateFreezeEvidenceAuditLogId: null,
      stateFreezeEvidenceSystemConfigIso: null,
      quarantineHardBanCount: 0,
      quarantineHardBanEvidenceLedgerId: null,
      complianceBlindSpots: [],
    });
    expect(md).toContain("SOC2 **CC6.3**");
    expect(md).toContain("ISO 27001 **Annex A.13.1**");
    expect(md).toContain("A.12.2");
    expect(md).toContain("Continuous Compliance under the Ironframe Constitution");
  });
});
