import { describe, expect, it } from "vitest";

import { isSalesSmsDraft } from "@/app/lib/approvalDraftChannel";
import { normalizeE164Phone } from "@/app/lib/phoneE164";

describe("isSalesSmsDraft", () => {
  it("detects sales SMS drafts from Execution Source", () => {
    const summary = [
      "[PENDING SALES DRAFT APPROVAL] Pilot intro",
      "--- Agent Proposed Reply Text ---",
      "Quick check-in on compliance runway.",
      "--- Prospect Context ---",
      "Execution Source: salesTeamPoll | Channel:SMS",
    ].join("\n");
    expect(isSalesSmsDraft(summary, "OTHER")).toBe(true);
    expect(isSalesSmsDraft(summary, "EMAIL")).toBe(true);
  });

  it("does not treat sales email drafts as SMS", () => {
    const summary = [
      "[PENDING SALES DRAFT APPROVAL] Pilot intro",
      "--- Agent Proposed Reply Text ---",
      "Hello",
      "--- Prospect Context ---",
      "Execution Source: salesTeamPoll | Channel:EMAIL",
    ].join("\n");
    expect(isSalesSmsDraft(summary, "EMAIL")).toBe(false);
  });

  it("does not treat support drafts as SMS", () => {
    expect(
      isSalesSmsDraft("[PENDING DRAFT APPROVAL] Re: ticket\nExecution Source: Channel:SMS", "OTHER"),
    ).toBe(false);
  });
});

describe("normalizeE164Phone", () => {
  it("normalizes US local and already-E.164 numbers", () => {
    expect(normalizeE164Phone("+12165550100")).toBe("+12165550100");
    expect(normalizeE164Phone("(216) 555-0100")).toBe("+12165550100");
    expect(normalizeE164Phone("1-216-555-0100")).toBe("+12165550100");
  });

  it("rejects empty / too-short values", () => {
    expect(normalizeE164Phone("")).toBeNull();
    expect(normalizeE164Phone("123")).toBeNull();
    expect(normalizeE164Phone(null)).toBeNull();
  });
});
