import { describe, expect, it } from "vitest";

import {
  DISPATCHED_DRAFT_TAG,
  PENDING_DRAFT_TAG,
  PENDING_SUPPORT_INTAKE_TAG,
  PURGED_DRAFT_TAG,
} from "@/app/lib/server/approvalQueueCore";
import { inferSupportTicketStatus } from "@/app/lib/server/supportPortalCore";

describe("supportPortalCore", () => {
  it("inferSupportTicketStatus maps intake and draft lifecycle", () => {
    expect(inferSupportTicketStatus(`${PENDING_SUPPORT_INTAKE_TAG} Re: ticket`)).toBe("OPEN");
    expect(inferSupportTicketStatus("[SUPPORT INTAKE PROCESSED] Re: ticket")).toBe("IN_PROGRESS");
    expect(inferSupportTicketStatus(`${PENDING_DRAFT_TAG} Re: reply`)).toBe("AWAITING_APPROVAL");
    expect(inferSupportTicketStatus(`${DISPATCHED_DRAFT_TAG} Re: reply`)).toBe("DISPATCHED");
    expect(inferSupportTicketStatus(`${PURGED_DRAFT_TAG} Re: reply`)).toBe("PURGED");
  });
});
