import { describe, expect, it } from "vitest";

import { formatElapsedDowntime } from "@/app/lib/formatDowntime";

describe("ironboard engine offline panel helpers", () => {
  it("formats elapsed downtime for operator display", () => {
    expect(formatElapsedDowntime(45_000)).toBe("45s");
    expect(formatElapsedDowntime(125_000)).toBe("2m 5s");
    expect(formatElapsedDowntime(3_725_000)).toBe("1h 2m 5s");
  });
});
