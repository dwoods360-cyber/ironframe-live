import { describe, expect, it } from "vitest";
import { analyzeRegulatoryGap } from "@/app/services/irontallyGapAnalysis";
import { COMPLIANCE_DRIFT_MATURITY_PENALTY } from "@/app/services/complianceDriftMaturityPenalty";

describe("irontallyGapAnalysis", () => {
  it("detects CRITICAL drift when SEC requires 30-day notification vs 45-day Ironcast cycle", () => {
    const { alert } = analyzeRegulatoryGap({
      source: "SEC.gov",
      sourceUrl: "https://www.sec.gov/",
      title: "SEC Reg S-P — 30-day breach notification",
      description:
        "Covered entities must provide breach notification within 30 days. Incident response amendments effective June 2026.",
      link: "https://www.sec.gov/example",
    });
    expect(alert).not.toBeNull();
    expect(alert?.isDriftDetected).toBe(true);
    expect(alert?.severity).toBe("CRITICAL");
    expect(alert?.tasSection).toBe("4.2");
    expect(alert?.pulseMessage).toMatch(/TAS DRIFT DETECTED/i);
  });

  it("matches tenant isolation keywords for ISO multi-tenant updates", () => {
    const { alert, matchedObligation } = analyzeRegulatoryGap({
      source: "ISO.org",
      sourceUrl: "https://www.iso.org/",
      title: "ISO 27001 update — multi-tenant isolation",
      description: "Annex A controls for tenant isolation and row level security in SaaS.",
      link: "https://www.iso.org/example",
    });
    expect(matchedObligation?.id).toBe("tenant_isolation");
    if (alert) expect(alert.keywordHits.length).toBeGreaterThan(0);
  });
});

describe("complianceDriftMaturityPenalty constant", () => {
  it("applies 1.5 point penalty per spec", () => {
    expect(COMPLIANCE_DRIFT_MATURITY_PENALTY).toBe(1.5);
  });
});
