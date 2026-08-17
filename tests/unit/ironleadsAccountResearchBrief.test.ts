import { describe, expect, it } from "vitest";

import {
  buildAccountResearchBrief,
  isPromoteReadyWorkEmail,
  mergeNamedBuyerIntoBriefMembers,
  selectAccountResearchBriefForReport,
} from "@/app/lib/server/ironleadsAccountResearchBrief";

describe("buildAccountResearchBrief", () => {
  it("HOLDs Pivot Point with OSCAR conflict and internal-only what-to-say", () => {
    const brief = buildAccountResearchBrief({
      company: "CBIZ Pivot Point Security",
      websiteUrl: "https://www.pivotpointsecurity.com",
      detectedTrigger: "COMPLIANCE_JOB_POST",
      industrySector: "MSSP",
      dealStage: "SUSPECT",
      corpus: "Managed security and GRC practice. Our OSCAR platform helps clients.",
      sourceUrls: ["https://www.pivotpointsecurity.com/about"],
      members: [
        {
          role: "MANAGING_DIRECTOR",
          fullName: "Example Lead",
          title: "Managing Director",
          emails: [{ email: "lead@example.com", status: "pattern_guess", source: null }],
          phones: [],
          sourceUrls: ["https://www.pivotpointsecurity.com/team"],
          note: null,
        },
      ],
      socialProfiles: [
        {
          network: "linkedin",
          url: "https://www.linkedin.com/company/pivot-point-security",
          kind: "company_page",
          fetchable: false,
          note: null,
        },
        {
          network: "youtube",
          url: "https://www.youtube.com/user/PivotPointSecurity",
          kind: "channel",
          fetchable: true,
          note: null,
        },
      ],
      hasRealEmail: false,
      hasPhone: true,
    });

    expect(brief.snapshot.status).toBe("HOLD");
    expect(brief.snapshot.existingGrcProducts).toContain("OSCAR");
    expect(brief.competitiveConflict.classification).toBe("competitor");
    expect(brief.gates.pain.result).toBe("FAIL");
    expect(brief.gates.email.result).toBe("FAIL");
    expect(brief.outreach.status).toBe("hold");
    expect(brief.outreach.whatToSay).toMatch(/Do not send Path B/i);
    expect(brief.outreach.whyThisApproach).toMatch(/HOLD/i);
    expect(brief.howToUse).toMatch(/Fit·Pain·Buyer·Email/i);
    expect(brief.linkedInIntelligence.urls[0]).toContain("linkedin.com");
    expect(brief.youtubeIntelligence.operatorPrompt).toMatch(/timestamps/i);
  });

  it("recommends promote when fit pain buyer email pass without conflict", () => {
    const brief = buildAccountResearchBrief({
      company: "Acme Managed GRC",
      websiteUrl: "https://acme-mgrc.example",
      detectedTrigger: "NEW_CISO",
      industrySector: "MSSP",
      dealStage: "SUSPECT",
      corpus: "We are an MSSP offering vCISO and managed GRC services.",
      sourceUrls: ["https://acme-mgrc.example/about"],
      members: [
        {
          role: "CISO",
          fullName: "Jordan Lee",
          title: "Chief Information Security Officer",
          emails: [
            {
              email: "jordan@acme-mgrc.example",
              status: "published",
              source: "contact",
            },
          ],
          phones: [],
          sourceUrls: ["https://acme-mgrc.example/team"],
          note: null,
        },
      ],
      socialProfiles: [],
      hasRealEmail: true,
      hasPhone: false,
    });

    expect(brief.snapshot.status).toBe("SUSPECT");
    expect(brief.gates.fit.result).toBe("PASS");
    expect(brief.gates.pain.result).toBe("PASS");
    expect(brief.gates.buyer.result).toBe("PASS");
    expect(brief.gates.email.result).toBe("PASS");
    expect(brief.outreach.status).toBe("promote");
    expect(brief.outreach.whatToSay).toMatch(/Jordan Lee|portfolio/i);
    expect(brief.outreach.howToUse).toMatch(/Promote/i);
    expect(brief.buyerMap[0]?.whyOwnsWorkflow).toMatch(/operational buyer/i);
  });

  it("fails Buyer on product/UI scrape junk even when switchboard phone exists", () => {
    const brief = buildAccountResearchBrief({
      company: "OC Security Audit",
      websiteUrl: "https://ocsecurityaudit.com",
      detectedTrigger: "COMPLIANCE_JOB_POST",
      industrySector: "MSSP",
      dealStage: "SUSPECT",
      corpus:
        "MSSP vCISO compliance advisory. Scorecard Free CISO. Readiness Tool CEO. IT Manager CFO.",
      sourceUrls: ["https://ocsecurityaudit.com"],
      members: [
        {
          role: "CISO",
          fullName: "Scorecard Free",
          title: "Scorecard Free CISO",
          emails: [
            {
              email: "sfree@ocsecurityaudit.com",
              status: "pattern_guess",
              source: "assumed_initial_last",
            },
          ],
          phones: [{ phone: "+19497775567", kind: "switchboard", status: "published", source: null }],
          sourceUrls: ["https://ocsecurityaudit.com"],
          note: null,
        },
        {
          role: "CEO",
          fullName: "Readiness Tool",
          title: "Readiness Tool CEO",
          emails: [],
          phones: [],
          sourceUrls: [],
          note: null,
        },
      ],
      socialProfiles: [],
      hasRealEmail: false,
      hasPhone: true,
    });

    expect(brief.gates.fit.result).toBe("PASS");
    expect(brief.gates.pain.result).toBe("PASS");
    expect(brief.gates.buyer.result).toBe("FAIL");
    expect(brief.gates.email.result).toBe("UNKNOWN");
    expect(brief.outreach.status).not.toBe("promote");
  });

  it("passes Buyer but keeps Email UNKNOWN when name exists without real inbox", () => {
    const brief = buildAccountResearchBrief({
      company: "Acme Managed GRC",
      websiteUrl: "https://acme-mgrc.example",
      detectedTrigger: "NEW_CISO",
      industrySector: "MSSP",
      dealStage: "SUSPECT",
      corpus: "We are an MSSP offering vCISO and managed GRC services. Jordan Lee CISO.",
      sourceUrls: ["https://acme-mgrc.example/about"],
      members: [
        {
          role: "CISO",
          fullName: "Jordan Lee",
          title: "Chief Information Security Officer",
          emails: [],
          phones: [{ phone: "+15551234567", kind: "switchboard", status: "published", source: null }],
          sourceUrls: ["https://acme-mgrc.example/team"],
          note: null,
        },
      ],
      socialProfiles: [],
      hasRealEmail: false,
      hasPhone: true,
    });

    expect(brief.gates.buyer.result).toBe("PASS");
    expect(brief.gates.email.result).toBe("UNKNOWN");
    expect(brief.gates.email.finding).toMatch(/no real work email/i);
    expect(brief.outreach.status).not.toBe("promote");
  });

  it("passes Buyer when only operator/Prospeo namedBuyer is present (no committee scrape)", () => {
    const members = mergeNamedBuyerIntoBriefMembers({
      members: [],
      namedBuyer: {
        fullName: "Chris DiSalle",
        title: "Founder & Cybersecurity Strategist",
        role: "FOUNDER",
        email: "cdisalle@nonasec.com",
        emailStatus: "VERIFIED",
        linkedinUrl: "https://www.linkedin.com/in/chrisdisalle",
      },
      contactEmail: "cdisalle@nonasec.com",
    });
    const brief = buildAccountResearchBrief({
      company: "NonaSec",
      websiteUrl: "https://nonasec.com/",
      detectedTrigger: null,
      industrySector: "MSSP_ENCLAVE",
      dealStage: "SUSPECT",
      corpus:
        "NonaSec\nMSSP_ENCLAVE\nhttps://nonasec.com/\nChris DiSalle\nFounder & Cybersecurity Strategist\nMSSP vCISO compliance advisory cybersecurity",
      sourceUrls: ["https://www.linkedin.com/in/chrisdisalle"],
      members,
      socialProfiles: [],
      hasRealEmail: true,
      hasPhone: false,
    });

    expect(brief.gates.buyer.result).toBe("PASS");
    expect(brief.gates.buyer.finding).toMatch(/Chris DiSalle/i);
    expect(brief.gates.email.result).toBe("PASS");
    expect(brief.buyerMap[0]?.purchaseRole).toBe("economic_buyer");
    expect(brief.gates.fit.result).toBe("PASS");
    // No harvest trigger → Pain UNKNOWN; operator can still Promote on Fit+Buyer+Email when Pain clears.
    expect(brief.gates.pain.result).toBe("UNKNOWN");
  });

  it("patches contact/Prospeo email onto an existing committee member (does not early-return empty)", () => {
    const members = mergeNamedBuyerIntoBriefMembers({
      members: [
        {
          role: "FOUNDER",
          fullName: "Steve West",
          title: "Co-Founder",
          emails: [],
          phones: [],
          sourceUrls: [],
          note: null,
        },
      ],
      namedBuyer: {
        fullName: "Steve West",
        title: "Principal Consultant & Co-Founder",
        email: "steve@solutionprovidersconsulting.com",
        emailStatus: "prospeo_verified",
      },
      contactEmail: "steve@solutionprovidersconsulting.com",
    });
    expect(members).toHaveLength(1);
    expect(members[0]?.emails[0]?.email).toBe("steve@solutionprovidersconsulting.com");
    expect(members[0]?.emails[0]?.status).toBe("prospeo_verified");
  });

  it("forces Email/Buyer FAIL and hold outreach when pathBHold is set (operator channel_competitor)", () => {
    const brief = buildAccountResearchBrief({
      company: "Triskele Labs",
      websiteUrl: "https://www.triskelelabs.com",
      detectedTrigger: "COMPLIANCE_JOB_POST",
      industrySector: "MSSP",
      dealStage: "SUSPECT",
      corpus: "Offensive security SOC compliance advisory. Nick Morgan CEO.",
      sourceUrls: ["https://www.triskelelabs.com/about"],
      members: [
        {
          role: "CEO",
          fullName: "Nick Morgan",
          title: "Founder & CEO",
          emails: [
            {
              email: "nick.morgan@triskelelabs.com",
              status: "VERIFIED",
              source: "prospeo",
            },
          ],
          phones: [],
          sourceUrls: [],
          note: null,
        },
      ],
      socialProfiles: [],
      hasRealEmail: true,
      contactEmail: "info@triskelelabs.com",
      pathBHold: true,
      hasPhone: true,
    });

    expect(brief.gates.email.result).toBe("FAIL");
    expect(brief.gates.buyer.result).toBe("FAIL");
    expect(brief.outreach.status).toBe("hold");
    expect(brief.snapshot.status).toBe("HOLD");
  });

  it("keeps Email UNKNOWN for company intake inboxes even when hasRealEmail is true", () => {
    expect(isPromoteReadyWorkEmail("info@corestackit.com")).toBe(false);
    expect(isPromoteReadyWorkEmail("hello@ai4itservices.com")).toBe(false);
    expect(isPromoteReadyWorkEmail("steve@solutionprovidersconsulting.com")).toBe(true);

    const brief = buildAccountResearchBrief({
      company: "CoreStack IT Solutions",
      websiteUrl: "https://corestackit.com",
      detectedTrigger: "COMPLIANCE_JOB_POST",
      industrySector: "MSSP",
      dealStage: "SUSPECT",
      corpus: "MSSP managed GRC vCISO. Mark Bailey Co-Founder.",
      sourceUrls: ["https://corestackit.com"],
      members: [
        {
          role: "FOUNDER",
          fullName: "Mark Bailey",
          title: "Co-Founder",
          emails: [],
          phones: [],
          sourceUrls: [],
          note: null,
        },
      ],
      socialProfiles: [],
      hasRealEmail: true,
      contactEmail: "info@corestackit.com",
      hasPhone: true,
    });

    expect(brief.gates.buyer.result).toBe("PASS");
    expect(brief.gates.email.result).toBe("UNKNOWN");
    expect(brief.gates.email.finding).toMatch(/company intake/i);
    expect(brief.outreach.status).not.toBe("promote");
  });

  it("merges Prospeo Email PASS onto persisted scrape brief without dropping corpus findings", () => {
    const persisted = buildAccountResearchBrief({
      company: "Solution Providers Consulting",
      websiteUrl: "https://solutionprovidersconsulting.com",
      detectedTrigger: "NEW_CISO",
      industrySector: "MSSP",
      dealStage: "SUSPECT",
      corpus: "Rich scrape corpus about SPCG managed GRC.",
      sourceUrls: ["https://solutionprovidersconsulting.com/about"],
      members: [
        {
          role: "FOUNDER",
          fullName: "Steve West",
          title: "Co-Founder",
          emails: [],
          phones: [],
          sourceUrls: [],
          note: "From scrape",
        },
      ],
      socialProfiles: [],
      hasRealEmail: false,
      hasPhone: true,
    });
    // Simulate operator adjudication text on Email gate.
    persisted.gates.email = {
      result: "UNKNOWN",
      finding: "No personal founder mailto on site yet.",
      why: "Keep researching.",
    };

    const members = mergeNamedBuyerIntoBriefMembers({
      members: [
        {
          role: "FOUNDER",
          fullName: "Steve West",
          title: "Co-Founder",
          emails: [],
          phones: [],
          sourceUrls: [],
          note: "From scrape",
        },
      ],
      namedBuyer: {
        fullName: "Steve West",
        email: "steve@solutionprovidersconsulting.com",
        emailStatus: "prospeo_verified",
      },
      contactEmail: "steve@solutionprovidersconsulting.com",
    });
    const rebuilt = buildAccountResearchBrief({
      company: "Solution Providers Consulting",
      websiteUrl: "https://solutionprovidersconsulting.com",
      detectedTrigger: "NEW_CISO",
      industrySector: "MSSP",
      dealStage: "SUSPECT",
      corpus: "Thin report corpus",
      sourceUrls: [],
      members,
      socialProfiles: [],
      hasRealEmail: true,
      contactEmail: "steve@solutionprovidersconsulting.com",
      hasPhone: true,
    });

    const selected = selectAccountResearchBriefForReport(persisted, rebuilt);
    expect(selected.reasons).toContain("email_improved");
    expect(selected.shouldPersist).toBe(true);
    expect(selected.brief.gates.email?.result).toBe("PASS");
    expect(selected.brief.gates.buyer.result).toBe("PASS");
    // Persisted scrape corpus / source ledger kept (not replaced by thin rebuild).
    expect(selected.brief.sourceLedger.some((s) => s.url.includes("/about"))).toBe(true);
  });
});
