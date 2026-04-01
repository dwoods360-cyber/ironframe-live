import { describe, it, expect } from "vitest";
import { formatUsdCentsBigInt } from "@/app/utils/formatUsdCentsBigInt";

describe("formatUsdCentsBigInt", () => {
  it("formats positive cents with grouping", () => {
    expect(formatUsdCentsBigInt(123456789n)).toBe("$1,234,567.89");
  });

  it("formats negative cents", () => {
    expect(formatUsdCentsBigInt(-50n)).toBe("-$0.50");
  });
});
