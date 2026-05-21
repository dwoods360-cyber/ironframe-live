import { describe, expect, it } from "vitest";
import { formatCentsToAccountingUSD } from "@/app/utils/formatCentsToUSD";

/** Industrial baseline: $100k base liability → governed cents per tenant. */
describe("formatCentsToAccountingUSD (Epic 8)", () => {
  it("renders 16,000,000 cents as $160,000.00 (Defense 1.6×)", () => {
    expect(formatCentsToAccountingUSD(16_000_000n)).toBe("$160,000.00");
    expect(formatCentsToAccountingUSD("16000000")).toBe("$160,000.00");
  });

  it("renders 10,000,000 cents as $100,000.00 (unity multiplier)", () => {
    expect(formatCentsToAccountingUSD(10_000_000n)).toBe("$100,000.00");
  });
});
