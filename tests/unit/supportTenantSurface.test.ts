import { describe, expect, it } from "vitest";

import {
  DISPATCHED_DRAFT_TAG,
  PENDING_DRAFT_TAG,
} from "@/app/lib/server/approvalQueueCore";
import { toTenantSafeSupportTicket } from "@/app/lib/server/supportTenantSurface";
import type { SupportPortalTicket } from "@/app/lib/server/supportPortalCore";
import {
  FORBIDDEN_TENANT_SUPPORT_FETCH_PREFIXES,
  isForbiddenTenantSupportFetchPath,
} from "@/app/lib/support/supportApiBoundary";

function baseTicket(overrides: Partial<SupportPortalTicket> = {}): SupportPortalTicket {
  return {
    id: "ticket-1",
    status: "OPEN",
    subject: "Support ticket",
    urgency: "ROUTINE",
    objective: "OTHER",
    objectiveLabel: "Other",
    userNotes: "Need help",
    path: "/dashboard",
    surface: "dashboard",
    frameworkContext: null,
    contactName: "Operator",
    contactEmail: "op@example.com",
    company: "Workspace Co",
    occurredAt: "2026-07-07T00:00:00.000Z",
    summaryExcerpt: "internal blob",
    proposedReply: "worker draft text",
    ...overrides,
  };
}

describe("supportTenantSurface", () => {
  it("forbids tenant support UI from targeting worker ops endpoints", () => {
    for (const prefix of FORBIDDEN_TENANT_SUPPORT_FETCH_PREFIXES) {
      expect(isForbiddenTenantSupportFetchPath(prefix)).toBe(true);
      expect(isForbiddenTenantSupportFetchPath(`${prefix}/nested`)).toBe(true);
    }
    expect(isForbiddenTenantSupportFetchPath("/api/support/tickets")).toBe(false);
  });

  it("toTenantSafeSupportTicket hides worker drafts until dispatch", () => {
    const pending = toTenantSafeSupportTicket(
      baseTicket({
        status: "AWAITING_APPROVAL",
        summaryExcerpt: `${PENDING_DRAFT_TAG} Re: help\n--- Agent Proposed Reply Text ---\nsecret`,
        proposedReply: "secret",
      }),
    );

    expect(pending).not.toHaveProperty("summaryExcerpt");
    expect(pending).not.toHaveProperty("proposedReply");
    expect(pending.resolutionText).toBeNull();

    const dispatched = toTenantSafeSupportTicket(
      baseTicket({
        status: "DISPATCHED",
        summaryExcerpt: [
          `${DISPATCHED_DRAFT_TAG} Re: Resolution update sent.`,
          "--- Authorized Text Dispatched ---",
          "Your issue is resolved.",
          "--- Trace Matrix ---",
        ].join("\n"),
      }),
    );

    expect(dispatched.resolutionText).toBe("Your issue is resolved.");
  });
});
