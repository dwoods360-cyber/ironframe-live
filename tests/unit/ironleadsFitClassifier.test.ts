import { describe, expect, it } from "vitest";
import { classifyPathBFit } from "@/app/lib/ironleadsFitClassifier";

describe("ironleadsFitClassifier", () => {
  it("PASS on MSSP / managed GRC language", () => {
    const r = classifyPathBFit({
      company: "DataEndure",
      corpus: "GRC-as-a-Service and managed security SOC for clients.",
    });
    expect(r.result).toBe("PASS");
    expect(r.channelCompetitor).toBe(false);
  });

  it("ADJACENT on MSP without MSSP/vCISO/managed-GRC", () => {
    const r = classifyPathBFit({
      company: "Node4",
      corpus: "We are a managed IT and cloud MSP with cybersecurity add-ons.",
    });
    expect(r.result).toBe("ADJACENT");
  });

  it("does not PASS on bare cybersecurity alone when MSP-framed", () => {
    const r = classifyPathBFit({
      company: "Acme IT",
      corpus: "IT support shop offering cybersecurity for small business.",
    });
    expect(r.result).toBe("ADJACENT");
  });

  it("CHANNEL/FAIL for MSP security platform vendors", () => {
    const r = classifyPathBFit({
      company: "Judy Security",
      corpus: "AI-powered cybersecurity platform for MSPs and MSSPs with Open XDR.",
    });
    expect(r.result).toBe("FAIL");
    expect(r.channelCompetitor).toBe(true);
  });

  it("FAIL channel for proprietary GRC competitors", () => {
    const r = classifyPathBFit({
      company: "Pivot Point Security",
      corpus: "OSCAR GRC platform for clients.",
      products: ["OSCAR"],
    });
    expect(r.result).toBe("FAIL");
    expect(r.channelCompetitor).toBe(true);
  });

  it("FAIL when practice type already documents product OEM / mega SI", () => {
    const r = classifyPathBFit({
      company: "Bitdefender",
      corpus:
        "Bitdefender is a global cybersecurity PRODUCT OEM (endpoint/antivirus platform) — not a Path B MSP/vCISO design partner.",
    });
    expect(r.result).toBe("FAIL");
    expect(r.channelCompetitor).toBe(true);
  });

  it("does not PASS on bare SOC 2 / HIPAA mentions alone", () => {
    const r = classifyPathBFit({
      company: "Acme Soft",
      corpus: "Our product helps customers meet SOC 2 and HIPAA.",
    });
    expect(r.result).not.toBe("PASS");
  });
});
