import { describe, expect, it } from "vitest";

import {
  isDeskNotesDeskDraft,
  isResearchDeskDraft,
  publishedRowBelongsToDesk,
  publishingDeskTabForQueueDraft,
} from "@/app/lib/governanceFrame/publishingDeskDraftKind";

describe("publishingDeskDraftKind", () => {
  it("routes research queue drafts to the research desk", () => {
    expect(isResearchDeskDraft("2026-07-15-draft-research-grc-evolution.md")).toBe(true);
    expect(
      publishingDeskTabForQueueDraft("2026-07-15-draft-research-grc-evolution.md"),
    ).toBe("research");
  });

  it("routes desk-note queue drafts to the desk-notes desk", () => {
    expect(isDeskNotesDeskDraft("2026-08-11-draft-desk-note-sec-105.md")).toBe(true);
    expect(
      publishingDeskTabForQueueDraft("2026-08-11-draft-signal-eu-ai-act.md"),
    ).toBe("desk-notes");
  });

  it("keeps newsletters off the research desk", () => {
    expect(
      publishingDeskTabForQueueDraft("2026-06-16-draft-newsletter-austrac-tranche-2.md"),
    ).toBe("newsletters");
  });

  it("keeps ordinary briefings on the briefings desk", () => {
    expect(
      publishingDeskTabForQueueDraft("2026-08-03-draft-auto-briefing-heatmap-vs-dollars.md"),
    ).toBe("briefings");
  });

  it("isolates published artifacts per desk enclave", () => {
    const deskNote = {
      slug: "2026-07-01-desk-note-sharepoint-kev",
      title: "Desk Note — SharePoint KEV",
    };
    const newsletter = {
      slug: "2026-06-16-newsletter-austrac-tranche-2",
      title: "AUSTRAC newsletter",
    };
    const briefing = {
      slug: "2026-06-16-research-cps-230-msp-contracts",
      title: "CPS 230 at the Contract Deadline",
    };
    const research = {
      slug: "2026-07-15-research-grc-evolution",
      title: "Industry Research Brief — Evolution of GRC",
    };

    expect(publishedRowBelongsToDesk("desk-notes", deskNote)).toBe(true);
    expect(publishedRowBelongsToDesk("briefings", deskNote)).toBe(false);
    expect(publishedRowBelongsToDesk("newsletters", newsletter)).toBe(true);
    expect(publishedRowBelongsToDesk("briefings", newsletter)).toBe(false);
    expect(publishedRowBelongsToDesk("briefings", briefing)).toBe(true);
    expect(publishedRowBelongsToDesk("research", research)).toBe(true);
    expect(publishedRowBelongsToDesk("briefings", research)).toBe(false);
  });
});
