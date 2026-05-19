import { describe, expect, it } from "vitest";
import {
  formatFrameworkLabelForCard,
  systemIntegrityDrillFromTitle,
} from "@/app/utils/riskCardEnrichment";

describe("riskCardEnrichment", () => {
  it("detects system integrity drill from title", () => {
    expect(systemIntegrityDrillFromTitle("System Integrity Drill — GRCBOT")).toBe("GRCBOT");
    expect(systemIntegrityDrillFromTitle("System Integrity Drill — KIMBOT #3")).toBe("KIMBOT");
  });

  it("formats SOC2 framework label", () => {
    expect(formatFrameworkLabelForCard("SOC2")).toBe("SOC 2");
  });
});
