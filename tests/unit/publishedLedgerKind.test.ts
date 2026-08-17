import { describe, expect, it } from "vitest";

import {
  classifyPublishedLedgerItem,
  publicationEnclaveMeta,
} from "@/app/lib/governanceFrame/publishedLedgerKind";

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

  it("classifies desk notes by category and title", () => {
    expect(
      classifyPublishedLedgerItem(
        '---\ncategory: desk-note\ntitle: "Desk Note — SEC Item 1.05 timing"\n---\n',
        "2026-08-11-desk-note-sec-105",
        "Desk Note — SEC Item 1.05 timing",
      ),
    ).toBe("desk_note");
    expect(
      classifyPublishedLedgerItem(
        '---\ntitle: "Signal — EU AI Act August gate"\n---\n',
        "2026-08-12-signal-eu-ai-act",
        "Signal — EU AI Act August gate",
      ),
    ).toBe("desk_note");
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

  it("maps each kind to its own enclave index", () => {
    expect(publicationEnclaveMeta("desk_note").indexHref).toBe("/desk-notes");
    expect(publicationEnclaveMeta("briefing").indexHref).toBe("/briefings");
    expect(publicationEnclaveMeta("newsletter").indexHref).toBe("/newsletters");
    expect(publicationEnclaveMeta("industry_research").indexHref).toBe("/research-papers");
  });
});
