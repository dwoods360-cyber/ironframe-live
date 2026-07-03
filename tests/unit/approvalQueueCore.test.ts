import { describe, expect, it } from "vitest";

import {
  DISPATCHED_DRAFT_TAG,
  DISPATCHED_SALES_DRAFT_TAG,
  PENDING_DRAFT_TAG,
  PENDING_SALES_DRAFT_TAG,
  inferDraftKind,
  isPendingDraftSummary,
  parsePendingDraftSummary,
} from "@/app/lib/server/approvalQueueCore";

describe("approvalQueueCore", () => {
  it("parses pending support draft subject and proposed reply from CRM summary blocks", () => {
    const summary = [
      "[PENDING DRAFT APPROVAL] Re: Ledger Mutation Error on Tier Setup",
      "--- Agent Proposed Reply Text ---",
      "Negative. The Irontrust math engine evaluates all financial assets strictly using pure BigInt integer cents.",
      "--- Tracking Core ---",
      "Execution Source: agentCustomerService | Source Ingress Resend ID: resend_123",
    ].join("\n");

    const parsed = parsePendingDraftSummary(summary);
    expect(parsed.subject).toBe("Ledger Mutation Error on Tier Setup");
    expect(parsed.proposedReply).toContain("BigInt integer cents");
    expect(inferDraftKind(summary)).toBe("SUPPORT");
  });

  it("parses pending sales draft subject, reply, and ingress notes", () => {
    const summary = [
      "[PENDING SALES DRAFT APPROVAL] Ironframe platform assessment — Acme Financial",
      "--- Agent Proposed Reply Text ---",
      "Your Medshield-scale perimeter aligns with our tenant isolation guarantees.",
      "--- Prospect Context ---",
      "Baseline Track: Medshield",
      "Ingress Notes: Verifying multi-tenant isolation gates.",
      "Execution Source: agentSalesConsole | Channel: PUBLIC_LEAD_FORM",
    ].join("\n");

    const parsed = parsePendingDraftSummary(summary);
    expect(parsed.subject).toBe("Ironframe platform assessment — Acme Financial");
    expect(parsed.proposedReply).toContain("tenant isolation guarantees");
    expect(parsed.incomingQuery).toBe("Verifying multi-tenant isolation gates.");
    expect(inferDraftKind(summary)).toBe("SALES");
    expect(isPendingDraftSummary(summary)).toBe(true);
  });

  it("parses support console incoming query from pending draft blocks", () => {
    const summary = [
      "[PENDING DRAFT APPROVAL] Re: Support console inquiry",
      "--- Incoming Query ---",
      "How does the system enforce operational data boundaries?",
      "--- Agent Proposed Reply Text ---",
      "Cluster barriers enforce strict tenant isolation.",
      "--- Tracking Core ---",
      "Execution Source: agentCustomerServiceConsole | Tenant: abc-123",
    ].join("\n");

    const parsed = parsePendingDraftSummary(summary);
    expect(parsed.incomingQuery).toBe(
      "How does the system enforce operational data boundaries?",
    );
  });

  it("defines stable ledger tag constants for dispatch transitions", () => {
    expect(PENDING_DRAFT_TAG).toBe("[PENDING DRAFT APPROVAL]");
    expect(PENDING_SALES_DRAFT_TAG).toBe("[PENDING SALES DRAFT APPROVAL]");
    expect(DISPATCHED_DRAFT_TAG).toBe("[DISPATCHED SUPPORT COURIER]");
    expect(DISPATCHED_SALES_DRAFT_TAG).toBe("[DISPATCHED SALES COURIER]");
  });
});
