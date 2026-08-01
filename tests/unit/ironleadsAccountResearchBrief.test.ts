import { describe, expect, it } from "vitest";

import { buildAccountResearchBrief } from "@/app/lib/server/ironleadsAccountResearchBrief";

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
    expect(brief.outreach.status).toBe("hold");
    expect(brief.outreach.whatToSay).toMatch(/Do not send Path B/i);
    expect(brief.outreach.whyThisApproach).toMatch(/HOLD/i);
    expect(brief.howToUse).toMatch(/Fit·Pain·Buyer/i);
    expect(brief.linkedInIntelligence.urls[0]).toContain("linkedin.com");
    expect(brief.youtubeIntelligence.operatorPrompt).toMatch(/timestamps/i);
  });

  it("recommends promote when fit pain buyer pass without conflict", () => {
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
    expect(brief.outreach.status).toBe("promote");
    expect(brief.outreach.whatToSay).toMatch(/Jordan Lee|portfolio/i);
    expect(brief.outreach.howToUse).toMatch(/Promote/i);
    expect(brief.buyerMap[0]?.whyOwnsWorkflow).toMatch(/operational buyer/i);
  });
});
