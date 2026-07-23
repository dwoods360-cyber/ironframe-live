import { describe, expect, it } from "vitest";

import {
  DESIGN_PARTNER_ORDER_FORM_LOCK_WORD,
  ORDER_FORM_COMMERCIAL_LOCKS,
  createEmptyOrderFormDraft,
  createEmptyOrderFormLockState,
  evaluateOrderFormLockEligibility,
  lockOrderForm,
  matchesOrderFormLockWord,
  renderOrderFormMarkdown,
  suggestOrderFormFromRecap,
  unlockOrderForm,
} from "@/app/lib/operations/designPartnerOrderForm";
import {
  WORKFLOW_REVIEW_RECAP_STORAGE_KEY,
  loadWorkflowReviewRecap,
  persistWorkflowReviewRecap,
} from "@/app/lib/operations/workflowReviewRecapBridge";
import type { WorkflowReviewCallRecap } from "@/app/lib/server/workflowReviewCallAssistCore";

describe("designPartnerOrderForm", () => {
  it("never pulls commercial fee/convert credit from recap suggestions", () => {
    const suggested = suggestOrderFormFromRecap({
      company: "Acme MSSP",
      contactName: "Alex Buyer",
      summary: ["Acme MSSP — workflow review.", "They want $0 Path B and 50% convert credit."],
      actionItems: [
        {
          owner: "prospect",
          text: 'Follow up on: "We will define board-ready multi-client evidence pack"',
        },
        {
          owner: "operator",
          text: "Send Path B order form ($4,999 · 90-day) with 2–3 written success criteria fields.",
        },
      ],
      openQuestions: ["How do we measure isolation without heatmap theater?"],
      generatedAt: "2026-07-23T12:00:00.000Z",
    });

    expect(suggested.customerLegalName).toBe("Acme MSSP");
    expect(suggested.billingContactName).toBe("Alex Buyer");
    expect(suggested.workspaceSlug).toContain("acme");
    expect(suggested.successCriteria[0]).toMatch(/board-ready multi-client/i);
    expect(suggested.successCriteria.join(" ")).not.toMatch(/\$4,?999/);
    expect(ORDER_FORM_COMMERCIAL_LOCKS.feeUsd).toBe(4999);
    expect(ORDER_FORM_COMMERCIAL_LOCKS.convertCreditUsd).toBe(4999);
  });

  it("accepts AGREED lock word case-insensitively", () => {
    expect(matchesOrderFormLockWord("agreed")).toBe(true);
    expect(matchesOrderFormLockWord(" AGREED! ")).toBe(true);
    expect(matchesOrderFormLockWord("yes")).toBe(false);
    expect(DESIGN_PARTNER_ORDER_FORM_LOCK_WORD).toBe("AGREED");
  });

  it("blocks lock until 2 criteria + client-owned operator email", () => {
    const draft = createEmptyOrderFormDraft({
      customerLegalName: "Acme",
      workspaceSlug: "acme",
      operatorEmail: "ops@ironframegrc.com",
      successCriteria: ["Short", "", ""],
    });
    const bad = evaluateOrderFormLockEligibility(draft);
    expect(bad.ok).toBe(false);
    expect(bad.reasons.some((r) => /client-owned/i.test(r))).toBe(true);

    const ready = createEmptyOrderFormDraft({
      customerLegalName: "Acme LLC",
      workspaceSlug: "acme",
      operatorEmail: "grc@acme.example",
      successCriteria: [
        "Board pack shows per-client cents without cross-tenant bleed",
        "Weekly eng sync produces one auditable evidence export path",
        "",
      ],
    });
    expect(evaluateOrderFormLockEligibility(ready).ok).toBe(true);
  });

  it("freeze + unlock audit trail", () => {
    let state = createEmptyOrderFormLockState();
    state = lockOrderForm(state, { note: "Partner said AGREED", at: "2026-07-23T12:01:00.000Z" });
    expect(state.locked).toBe(true);
    state = unlockOrderForm(state, "Partner corrected criterion 2", "2026-07-23T12:05:00.000Z");
    expect(state.locked).toBe(false);
    expect(state.unlockAudit).toHaveLength(1);
    expect(() => unlockOrderForm(createEmptyOrderFormLockState(), "no")).toThrow(/reason/i);
  });

  it("markdown marks commercial locks and lock status", () => {
    const draft = createEmptyOrderFormDraft({
      customerLegalName: "Acme",
      operatorEmail: "a@acme.test",
      workspaceSlug: "acme",
      successCriteria: ["Criterion one is long enough", "Criterion two is long enough", ""],
    });
    const locked = lockOrderForm(createEmptyOrderFormLockState(), { at: "t1" });
    const md = renderOrderFormMarkdown(draft, ORDER_FORM_COMMERCIAL_LOCKS, locked);
    expect(md).toContain("**LOCKED**");
    expect(md).toContain("Commercial terms (locked");
    expect(md).toContain("$4,999");
  });
});

describe("workflowReviewRecapBridge", () => {
  it("round-trips recap payload for order-form suggest", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    };
    const recap = {
      generatedAt: "2026-07-23T12:00:00.000Z",
      company: "Pivot Point Security",
      contactName: "vCISO",
      channel: "teams",
      wordCount: 120,
      summary: ["Pivot Point Security — workflow review via teams."],
      buyingSignals: [],
      objections: [],
      openQuestions: [],
      actionItems: [
        { owner: "prospect" as const, text: "We will share the board pack template", priority: "now" as const },
      ],
      pathBAsk: "Ask now: Path B",
      closeReadiness: {
        band: "high" as const,
        score: 80,
        summary: "Ready",
        nextMove: "Order form",
      },
      markdown: "# recap",
    } satisfies WorkflowReviewCallRecap;

    persistWorkflowReviewRecap(recap, storage);
    expect(store.has(WORKFLOW_REVIEW_RECAP_STORAGE_KEY)).toBe(true);
    const loaded = loadWorkflowReviewRecap(storage);
    expect(loaded?.company).toBe("Pivot Point Security");
    expect(loaded?.actionItems[0]?.text).toMatch(/board pack/i);
  });
});
