import { describe, expect, it } from "vitest";

import { classifyPublishedLedgerItem } from "@/app/lib/governanceFrame/publishedLedgerKind";

describe("classifyPublishedLedgerItem", () => {
  it("classifies newsletter slugs", () => {
    expect(
      classifyPublishedLedgerItem(
        '---\ntitle: "AU newsletter"\n---\n',
        "2026-06-16-newsletter-austrac-tranche-2",
        "AU newsletter",
      ),
    ).toBe("newsletter");
  });

  it("classifies industry research briefs by title", () => {
    expect(
      classifyPublishedLedgerItem(
        '---\ntitle: "Industry Research Brief — Evolution of GRC"\n---\n',
        "2026-07-15-research-grc-evolution",
        "Industry Research Brief — Evolution of GRC",
      ),
    ).toBe("industry_research");
  });

  it("keeps ordinary research-named briefings under briefing", () => {
    expect(
      classifyPublishedLedgerItem(
        '---\ntitle: "CPS 230 at the Contract Deadline"\n---\n',
        "2026-06-16-research-cps-230-msp-contracts",
        "CPS 230 at the Contract Deadline",
      ),
    ).toBe("briefing");
  });
});
