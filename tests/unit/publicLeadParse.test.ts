import { describe, expect, it } from "vitest";

import { parseDollarAleToBigIntCents } from "@/app/lib/server/salesIntakeParse";

describe("public lead ALE parsing", () => {
  it("converts dollar strings to bigint cents without float", () => {
    const parsed = parseDollarAleToBigIntCents("11,100,000.00");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.cents).toBe(1110000000n);
      expect(typeof parsed.cents).toBe("bigint");
    }
  });
});
