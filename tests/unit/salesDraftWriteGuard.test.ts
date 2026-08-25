import { describe, expect, it } from "vitest";

import {
  DISPATCHED_SALES_COURIER_TAG,
  PENDING_SALES_DRAFT_APPROVAL_TAG,
  gateSalesDraftWrite,
  isDispatchedSalesDraftSummary,
  isPendingSalesDraftSummary,
} from "@/app/lib/salesDraftWriteGuard";

describe("salesDraftWriteGuard", () => {
  it("detects dispatched vs pending tags", () => {
    expect(
      isDispatchedSalesDraftSummary(
        `${DISPATCHED_SALES_COURIER_TAG} subject\nbody`,
      ),
    ).toBe(true);
    expect(
      isPendingSalesDraftSummary(
        `${PENDING_SALES_DRAFT_APPROVAL_TAG} subject\nbody`,
      ),
    ).toBe(true);
    expect(
      isPendingSalesDraftSummary(
        `${DISPATCHED_SALES_COURIER_TAG} subject\nbody`,
      ),
    ).toBe(false);
  });

  it("hard-locks DISPATCHED rows", () => {
    const gate = gateSalesDraftWrite({
      id: "abc",
      summary: `${DISPATCHED_SALES_COURIER_TAG} Re: seat\n--- Trace ---`,
    });
    expect(gate).toEqual({
      ok: false,
      id: "abc",
      reason: "DISPATCHED_LOCKED",
    });
  });

  it("allows PENDING rewrites", () => {
    const gate = gateSalesDraftWrite({
      id: "abc",
      summary: `${PENDING_SALES_DRAFT_APPROVAL_TAG} subject\nHi there`,
    });
    expect(gate.ok).toBe(true);
  });

  it("blocks non-pending when requirePending (default)", () => {
    const gate = gateSalesDraftWrite({
      id: "abc",
      summary: "[HOLD PARKED DRAFT] parked",
    });
    expect(gate).toEqual({ ok: false, id: "abc", reason: "NOT_PENDING" });
  });
});
