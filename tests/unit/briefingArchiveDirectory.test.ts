import { describe, expect, it } from "vitest";

import type { GovernanceBriefing } from "@/app/lib/governanceFrame/briefingFilesystemLedger";
import { listBriefingArchiveEntries } from "@/app/lib/governanceFrame/briefingArchiveDirectory";

function item(overrides: Partial<GovernanceBriefing> = {}): GovernanceBriefing {
  return {
    slug: "2026-01-15-market-grc-2000-2008",
    filename: "2026-01-15-market-grc-2000-2008.md",
    title: "Control-First GRC: Part 1",
    author: "Ironframe Governance Frame",
    classification: "Institutional Governance",
    publishedAt: "2026-07-16T15:29:57.625Z",
    markdown: `> **Executive Summary:** SOX made control assurance mandatory without immutable evidence systems.`,
    sortKey: Date.parse("2026-07-16T15:29:57.625Z"),
    ...overrides,
  };
}

describe("listBriefingArchiveEntries", () => {
  it("returns briefings newest first with synopsis", () => {
    const entries = listBriefingArchiveEntries([
      item({
        slug: "2026-01-15-market-grc-2000-2008",
        publishedAt: "2026-07-16T15:00:00.000Z",
        sortKey: 1,
      }),
      item({
        slug: "2026-05-14-connector-count-sovereign-enclaves",
        title: "Connector Count",
        publishedAt: "2026-07-16T17:00:00.000Z",
        sortKey: 2,
        markdown: `> **Executive Summary:** Multi-entity operators need sovereign audit enclaves.`,
      }),
    ]);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.slug).toBe("2026-05-14-connector-count-sovereign-enclaves");
    expect(entries[0]?.synopsis).toMatch(/sovereign audit enclaves/i);
  });

  it("excludes industry research briefs and newsletters", () => {
    const entries = listBriefingArchiveEntries([
      item(),
      item({
        slug: "2026-07-16-research-dora-supervision",
        title: "Industry Research Brief — DORA",
        markdown: `---\ncategory: research-briefing\n---\n> Summary`,
      }),
      item({
        slug: "2026-07-16-newsletter-csrd-omnibus-esrs",
        title: "CSRD newsletter",
        markdown: `---\ncategory: newsletter\n---\n> Summary`,
      }),
    ]);
    expect(entries.map((e) => e.slug)).toEqual(["2026-01-15-market-grc-2000-2008"]);
  });
});
