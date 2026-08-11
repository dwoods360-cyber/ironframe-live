import { describe, expect, it } from "vitest";

import {
  buildAccountResearchBrief,
  isPromoteReadyWorkEmail,
  mergeNamedBuyerIntoBriefMembers,
  selectAccountResearchBriefForReport,
} from "@/app/lib/server/ironleadsAccountResearchBrief";
import { isPlausiblePersonName } from "@/app/lib/server/ironleadsBuyingCommitteeExtract";
import { buildIronleadsSuspectReport } from "@/app/lib/server/ironleadsSuspectReportCore";

describe("TechHeights gate regression", () => {
  it("treats Shuchipan Sharma as a plausible person name", () => {
    expect(isPlausiblePersonName("Shuchipan Sharma")).toBe(true);
    expect(isPromoteReadyWorkEmail("ssharma@techheights.com")).toBe(true);
  });

  it("does not clobber operator Prospeo PASS with a thin rebuild FAIL", () => {
    const members = mergeNamedBuyerIntoBriefMembers({
      members: [],
      namedBuyer: {
        fullName: "Shuchipan Sharma",
        title: "Founder & CEO",
        role: "FOUNDER_CEO",
        email: "ssharma@techheights.com",
        emailStatus: "VERIFIED",
        linkedinUrl: "https://www.linkedin.com/in/shuchipan-sharma-39387a28",
      },
      contactEmail: "ssharma@techheights.com",
    });

    const persisted = buildAccountResearchBrief({
      company: "TechHeights",
      websiteUrl: "https://techheights.com",
      detectedTrigger: "COMPLIANCE_JOB_POST",
      industrySector: "MSSP",
      dealStage: "SUSPECT",
      corpus:
        "Rich operator dossier: CMMC MSSP vCISO managed compliance aerospace.",
      sourceUrls: ["https://techheights.com/who-we-are/"],
      members,
      socialProfiles: [],
      hasRealEmail: true,
      contactEmail: "ssharma@techheights.com",
      hasPhone: true,
    });
    expect(persisted.gates.buyer.result).toBe("PASS");
    expect(persisted.gates.email.result).toBe("PASS");

    // Thin rebuild as if namedBuyer resolution failed (empty members).
    const thinRebuild = buildAccountResearchBrief({
      company: "TechHeights",
      websiteUrl: "https://techheights.com",
      detectedTrigger: "COMPLIANCE_JOB_POST",
      industrySector: "MSSP",
      dealStage: "SUSPECT",
      corpus: "MSSP vCISO compliance advisory cybersecurity",
      sourceUrls: [],
      members: [],
      socialProfiles: [],
      hasRealEmail: false,
      contactEmail: null,
      hasPhone: true,
    });
    expect(thinRebuild.gates.buyer.result).toBe("FAIL");
    expect(thinRebuild.gates.email.result).toBe("UNKNOWN");

    const selected = selectAccountResearchBriefForReport(persisted, thinRebuild);
    expect(selected.brief.gates.buyer.result).toBe("PASS");
    expect(selected.brief.gates.email.result).toBe("PASS");
    expect(selected.brief.buyerMap.some((b) => b.name === "Shuchipan Sharma")).toBe(
      true,
    );
  });

  it("live CRM report keeps TechHeights Buyer/Email PASS", async () => {
    const report = await buildIronleadsSuspectReport(
      "0ee9d9a8-88f2-4617-ba51-03f02b697797",
    );
    expect(report).not.toBeNull();
    expect(report!.email).toBe("ssharma@techheights.com");
    expect(report!.namedBuyer?.fullName).toBe("Shuchipan Sharma");
    expect(report!.accountResearchBrief?.gates.buyer.result).toBe("PASS");
    expect(report!.accountResearchBrief?.gates.email.result).toBe("PASS");
    // Must keep dossier corpus — harvest rebuild Fit text means selection returned thin rebuild.
    expect(report!.accountResearchBrief?.gates.fit.finding).toMatch(/TechHeights, LLC/i);
    expect(report!.accountResearchBrief?.gates.buyer.finding).toMatch(/Shuchipan Sharma/i);
    expect(report!.accountResearchBrief?.gates.fit.finding).not.toMatch(
      /^Public site signals:/,
    );
  }, 30000);

  it("keeps promote-ready persisted brief even when rebuild is thin FAIL", () => {
    const persisted = buildAccountResearchBrief({
      company: "TechHeights",
      websiteUrl: "https://techheights.com",
      detectedTrigger: "COMPLIANCE_JOB_POST",
      industrySector: "MSSP",
      dealStage: "SUSPECT",
      corpus: "MSSP vCISO managed compliance CMMC aerospace",
      sourceUrls: ["https://techheights.com/who-we-are/"],
      members: mergeNamedBuyerIntoBriefMembers({
        members: [],
        namedBuyer: {
          fullName: "Shuchipan Sharma",
          title: "Founder & CEO",
          role: "FOUNDER_CEO",
          email: "ssharma@techheights.com",
          emailStatus: "VERIFIED",
        },
        contactEmail: "ssharma@techheights.com",
        accountDomain: "techheights.com",
      }),
      socialProfiles: [],
      hasRealEmail: true,
      contactEmail: "ssharma@techheights.com",
      accountDomain: "techheights.com",
      hasPhone: true,
    });
    persisted.gates.fit.finding =
      "TechHeights, LLC (Irvine CA): MSP/MSSP since 2007 — managed IT.";
    persisted.outreach.status = "promote_ready";

    const thinRebuild = buildAccountResearchBrief({
      company: "TechHeights",
      websiteUrl: "https://techheights.com",
      detectedTrigger: "COMPLIANCE_JOB_POST",
      industrySector: "MSSP",
      dealStage: "SUSPECT",
      corpus: "MSSP vCISO compliance advisory cybersecurity",
      sourceUrls: [],
      members: [],
      socialProfiles: [],
      hasRealEmail: false,
      contactEmail: null,
      hasPhone: true,
    });

    const selected = selectAccountResearchBriefForReport(persisted, thinRebuild);
    expect(selected.brief.gates.buyer.result).toBe("PASS");
    expect(selected.brief.gates.email.result).toBe("PASS");
    expect(selected.brief.gates.fit.finding).toMatch(/TechHeights, LLC/i);
    expect(selected.shouldPersist).toBe(false);
    expect(selected.reasons).toContain("kept_persisted_promote_ready");
  });
});
