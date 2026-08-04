import { describe, expect, it } from "vitest";

import {
  isResearchDeskDraft,
  publishingDeskTabForQueueDraft,
} from "@/app/lib/governanceFrame/publishingDeskDraftKind";

describe("publishingDeskDraftKind", () => {
  it("routes research queue drafts to the research desk", () => {
    expect(isResearchDeskDraft("2026-07-15-draft-research-grc-evolution.md")).toBe(true);
    expect(
      publishingDeskTabForQueueDraft("2026-07-15-draft-research-grc-evolution.md"),
    ).toBe("research");
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
});
