import { describe, expect, it } from "vitest";

import type { GovernanceBriefing } from "@/app/lib/governanceFrame/briefingFilesystemLedger";
import {
  isMarketingArchiveEligible,
  toPublishedBriefingCard,
} from "@/app/lib/governanceFrame/publishedBriefingLedgerCards";
import { isPublicPublishedClassification } from "@/app/lib/governanceFrame/publicPublishedBriefingEligibility";
import { GOVERNANCE_FRAME_PUBLIC_ORIGIN } from "@/config/governanceFramePublic";

function briefing(overrides: Partial<GovernanceBriefing> = {}): GovernanceBriefing {
  return {
    slug: "2026-07-16-market-disclosure",
    filename: "2026-07-16-market-disclosure.md",
    title: "Disclosure Clocks and Continuous Controls",
    author: "Executive Intelligence Unit",
    classification: "Institutional Governance",
    publishedAt: "2026-07-16T12:00:00.000Z",
    markdown: `---
title: "Disclosure Clocks and Continuous Controls"
summary: Boards that still prove last quarter lose hours when disclosure clocks start.
category: market-analysis
classification: Institutional Governance
---

> **Executive Summary:** Boards that still prove last quarter lose hours when disclosure clocks start.
`,
    sortKey: Date.parse("2026-07-16T12:00:00.000Z"),
    ...overrides,
  };
}

describe("publishedBriefingLedgerCards", () => {
  it("projects metadata cards linking to Governance Frame canonical URLs", () => {
    const card = toPublishedBriefingCard(briefing());
    expect(card.title).toBe("Disclosure Clocks and Continuous Controls");
    expect(card.oneLiner).toMatch(/disclosure clocks/i);
    expect(card.kind).toBe("briefing");
    expect(card.canonicalUrl).toBe(
      `${GOVERNANCE_FRAME_PUBLIC_ORIGIN}/briefings/2026-07-16-market-disclosure`,
    );
    expect(card).not.toHaveProperty("markdown");
    expect(card).not.toHaveProperty("content");
  });

  it("strips Path B / sales CTA phrases from one-liners", () => {
    const card = toPublishedBriefingCard(
      briefing({
        markdown: `---
summary: Join our Path B $4,999 cohort and Request Demo today.
---
`,
      }),
    );
    expect(card.oneLiner).toBe("Published institutional governance briefing.");
    expect(card.oneLiner).not.toMatch(/path b|4,?999|request demo/i);
  });

  it("excludes internal / staging classifications from marketing archive", () => {
    expect(
      isMarketingArchiveEligible(
        briefing({ classification: "INTERNAL STAGING" }),
      ),
    ).toBe(false);
    expect(isMarketingArchiveEligible(briefing())).toBe(true);
    expect(isPublicPublishedClassification("INTERNAL STAGING")).toBe(false);
    expect(isPublicPublishedClassification("Institutional Governance")).toBe(true);
  });

  it("labels Ironcast / newsletter editions", () => {
    const card = toPublishedBriefingCard(
      briefing({
        slug: "2026-07-16-auto-newsletter-cohort",
        markdown: `---
category: newsletter
summary: Free pilots stall when no sponsor owns evidence export.
---
`,
      }),
    );
    expect(card.kind).toBe("newsletter");
  });
});
