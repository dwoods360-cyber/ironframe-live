import { describe, expect, it } from "vitest";

import {
  buildNeedsEnrichmentDealNote,
  buildNeedsEnrichmentSummary,
  needsEnrichmentPlaceholderEmail,
} from "@/app/lib/server/approvalNeedsEnrichmentCore";
import {
  NEEDS_ENRICHMENT_DRAFT_TAG,
  PENDING_SALES_DRAFT_TAG,
  isPendingDraftSummary,
} from "@/app/lib/server/approvalQueueCore";

describe("approvalNeedsEnrichmentCore", () => {
  it("builds a stable @ironleads.local placeholder from contact id", () => {
    const email = needsEnrichmentPlaceholderEmail("c1547560-8687-46cc-b9e4-9a6caaecbc7b");
    expect(email).toBe("needs-enrichment+c15475608687@ironleads.local");
    expect(email.endsWith("@ironleads.local")).toBe(true);
  });

  it("archives summary under NEEDS ENRICHMENT so it is not pending", () => {
    const original = [
      `${PENDING_SALES_DRAFT_TAG} GRC workflow at Pivot Point Security`,
      "--- Agent Proposed Reply Text ---",
      "Body",
    ].join("\n");
    const archived = buildNeedsEnrichmentSummary(original);
    expect(archived.startsWith(NEEDS_ENRICHMENT_DRAFT_TAG)).toBe(true);
    expect(archived).toContain("Discarded Copy");
    expect(archived).toContain(PENDING_SALES_DRAFT_TAG);
    expect(isPendingDraftSummary(archived)).toBe(false);
  });

  it("records prior destinations in the deal note", () => {
    const note = buildNeedsEnrichmentDealNote({
      stamp: "2026-08-01T14:00:00.000Z",
      priorEmail: "dwoods360@gmail.com",
      priorPhone: "+16123258404",
      operatorNote: "Wrong phone; dry-run To",
    });
    expect(note).toContain("Needs enrichment");
    expect(note).toContain("dwoods360@gmail.com");
    expect(note).toContain("+16123258404");
    expect(note).toContain("PROSPECT → SUSPECT");
    expect(note).toContain("Wrong phone");
  });
});
