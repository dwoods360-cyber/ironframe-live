import { describe, expect, it } from "vitest";

import {
  hasNamedBuyerName,
  isHarvestPlaceholderEmail,
  shouldAutoEnrichPlaceholder,
  shouldAutoQueueTouch1Draft,
} from "@/app/lib/ironleadsPreOutreachPolicy";

describe("pre-outreach policy", () => {
  it("treats empty and @ironleads.local as placeholders", () => {
    expect(isHarvestPlaceholderEmail(null)).toBe(true);
    expect(isHarvestPlaceholderEmail("ops@ironleads.local")).toBe(true);
    expect(isHarvestPlaceholderEmail("jane.doe@cyberdome.net")).toBe(false);
  });

  it("requires first + last for a named buyer", () => {
    expect(hasNamedBuyerName("Jane Doe")).toBe(true);
    expect(hasNamedBuyerName("Jane")).toBe(false);
    expect(hasNamedBuyerName("")).toBe(false);
  });

  it("enriches named-buyer placeholders and skips Fit FAIL / HOLD", () => {
    const base = {
      email: "lead@ironleads.local",
      namedBuyerName: "Jane Doe",
      fit: "PASS",
      holdClassification: null,
      company: "Cyberdome",
    };
    expect(shouldAutoEnrichPlaceholder(base)).toBe(true);
    expect(shouldAutoEnrichPlaceholder({ ...base, fit: "ADJACENT" })).toBe(true);
    expect(shouldAutoEnrichPlaceholder({ ...base, fit: "FAIL" })).toBe(false);
    expect(
      shouldAutoEnrichPlaceholder({ ...base, holdClassification: "channel_competitor" }),
    ).toBe(false);
    expect(
      shouldAutoEnrichPlaceholder({ ...base, email: "jane.doe@cyberdome.net" }),
    ).toBe(false);
    expect(shouldAutoEnrichPlaceholder({ ...base, namedBuyerName: "Jane" })).toBe(
      false,
    );
  });

  it("queues T1 only for Fit PASS + promote-ready work email", () => {
    const base = {
      email: "jane.doe@cyberdome.net",
      namedBuyerName: "Jane Doe",
      fit: "PASS",
      holdClassification: null,
      company: "Cyberdome",
    };
    expect(shouldAutoQueueTouch1Draft(base)).toBe(true);
    expect(shouldAutoQueueTouch1Draft({ ...base, fit: "ADJACENT" })).toBe(false);
    expect(shouldAutoQueueTouch1Draft({ ...base, email: "sales@cyberdome.net" })).toBe(
      false,
    );
    expect(shouldAutoQueueTouch1Draft({ ...base, email: "lead@ironleads.local" })).toBe(
      false,
    );
  });
});
