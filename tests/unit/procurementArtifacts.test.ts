import { describe, expect, it } from "vitest";

import {
  DPA_FRAMEWORK_SECTIONS,
  DATA_RESIDENCY_SECTIONS,
  SUBPROCESSOR_LIST_SECTIONS,
  TRUST_CENTER_ARTIFACTS,
} from "@/app/lib/legal/procurement";

describe("procurement trust artifacts", () => {
  it("exposes three diligence documents for dashboard trust center", () => {
    expect(TRUST_CENTER_ARTIFACTS).toHaveLength(3);
    expect(TRUST_CENTER_ARTIFACTS.map((a) => a.slug)).toEqual([
      "dpa",
      "subprocessors",
      "data-residency",
    ]);
  });

  it("includes single-region and BigInt billing references", () => {
    const blob = [
      ...DPA_FRAMEWORK_SECTIONS,
      ...SUBPROCESSOR_LIST_SECTIONS,
      ...DATA_RESIDENCY_SECTIONS,
    ]
      .map((s) => s.body)
      .join(" ");
    expect(blob).toMatch(/single-region/i);
    expect(blob).toMatch(/BigInt/i);
    expect(blob).toMatch(/payment_intent\.succeeded/i);
  });
});
