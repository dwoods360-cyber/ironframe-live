import { describe, expect, it } from "vitest";

import type { GovernanceBriefing } from "@/app/lib/governanceFrame/briefingFilesystemLedger";
import {
  briefingArchiveExcluding,
  listBriefingArchiveEntries,
  listPublishedLedgerEntriesForKind,
  partitionHomeBriefings,
} from "@/app/lib/governanceFrame/briefingArchiveDirectory";

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

  it("excludes industry research briefs, newsletters, and desk notes", () => {
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
      item({
        slug: "2026-07-01-draft-desk-note-sharepoint-kev",
        title: "Desk Note — SharePoint KEV",
        markdown: `---\ncategory: desk-note\n---\n> Summary`,
      }),
    ]);
    expect(entries.map((e) => e.slug)).toEqual(["2026-01-15-market-grc-2000-2008"]);
  });
});

describe("listPublishedLedgerEntriesForKind", () => {
  it("keeps each publication enclave isolated", () => {
    const ledger = [
      item(),
      item({
        slug: "2026-07-01-desk-note-sharepoint-kev",
        title: "Desk Note — SharePoint KEV",
        publishedAt: "2026-07-01T12:00:00.000Z",
        markdown: `---\ncategory: desk-note\ntitle: "Desk Note — SharePoint KEV"\n---\n`,
      }),
      item({
        slug: "2026-08-07-desk-note-bod-26-04",
        title: "Desk Note — BOD 26-04",
        publishedAt: "2026-08-07T12:00:00.000Z",
        markdown: `---\ncategory: desk-note\n---\n`,
      }),
      item({
        slug: "2026-07-16-newsletter-csrd-omnibus-esrs",
        title: "CSRD newsletter",
        markdown: `---\ncategory: newsletter\n---\n`,
      }),
    ];

    const deskNotes = listPublishedLedgerEntriesForKind(ledger, "desk_note");
    expect(deskNotes.map((e) => e.slug)).toEqual([
      "2026-08-07-desk-note-bod-26-04",
      "2026-07-01-desk-note-sharepoint-kev",
    ]);

    const briefings = listPublishedLedgerEntriesForKind(ledger, "briefing");
    expect(briefings.map((e) => e.slug)).toEqual(["2026-01-15-market-grc-2000-2008"]);

    const newsletters = listPublishedLedgerEntriesForKind(ledger, "newsletter");
    expect(newsletters.map((e) => e.slug)).toEqual([
      "2026-07-16-newsletter-csrd-omnibus-esrs",
    ]);
  });
});

describe("partitionHomeBriefings / briefingArchiveExcluding", () => {
  it("puts overflow-only items in the archive", () => {
    const entries = listBriefingArchiveEntries(
      Array.from({ length: 6 }, (_, i) =>
        item({
          slug: `2026-0${i + 1}-15-briefing`,
          publishedAt: `2026-07-${16 - i}T12:00:00.000Z`,
          title: `Briefing ${i + 1}`,
        }),
      ),
    );
    const { featured, archive } = partitionHomeBriefings(entries);
    expect(featured).toHaveLength(3);
    expect(archive).toHaveLength(3);
    expect(archive.map((e) => e.slug)).toEqual([
      "2026-04-15-briefing",
      "2026-05-15-briefing",
      "2026-06-15-briefing",
    ]);
    expect(featured.map((e) => e.slug)).not.toContain(archive[0]?.slug);
  });

  it("excludes the open briefing from the article archive", () => {
    const entries = listBriefingArchiveEntries([
      item({ slug: "a-briefing", publishedAt: "2026-07-16T12:00:00.000Z" }),
      item({ slug: "b-briefing", publishedAt: "2026-07-15T12:00:00.000Z", title: "B" }),
    ]);
    const archive = briefingArchiveExcluding(entries, ["a-briefing"]);
    expect(archive.map((e) => e.slug)).toEqual(["b-briefing"]);
  });
});
