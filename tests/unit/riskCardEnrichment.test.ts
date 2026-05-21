import { describe, expect, it } from "vitest";
import {
  extractRawAuditMarkdown,
  formatFrameworkLabelForCard,
  isCsrdForensicArtifact,
  systemIntegrityDrillFromTitle,
} from "@/app/utils/riskCardEnrichment";

describe("riskCardEnrichment", () => {
  it("detects system integrity drill from title", () => {
    expect(systemIntegrityDrillFromTitle("System Integrity Drill — GRCBOT")).toBe("GRCBOT");
    expect(systemIntegrityDrillFromTitle("System Integrity Drill — KIMBOT #3")).toBe("KIMBOT");
  });

  it("formats SOC2 framework label", () => {
    expect(formatFrameworkLabelForCard("SOC2")).toBe("SOC 2");
  });

  it("extracts Ironscribe markdown from ingestion details", () => {
    const md = extractRawAuditMarkdown({
      rawAuditMarkdown: "# FORENSIC AUDIT TRAIL",
      financialImpactCents: "850",
    });
    expect(md).toContain("FORENSIC AUDIT TRAIL");
    expect(isCsrdForensicArtifact(md, "ESRS E1-6")).toBe(true);
  });
});
