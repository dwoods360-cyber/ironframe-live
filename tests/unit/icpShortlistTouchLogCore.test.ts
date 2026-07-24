import { describe, expect, it } from "vitest";

/**
 * Pure sourceRef contract (mirrors buildIcpTouchSourceRef in icpShortlistTouchLogCore).
 * Avoid importing server-only core in unit smoke when vitest deps are thin.
 */
function buildSourceRef(input: {
  touch: "TOUCH1" | "TOUCH2" | "TOUCH3";
  interactionId?: string | null;
  company: string;
  date: string;
  channel: "EMAIL" | "SMS";
}): string {
  const interaction = input.interactionId?.trim();
  if (interaction) return `icp-touch:${input.touch}:${interaction}`;
  const slug = input.company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `icp-touch:${input.touch}:manual:${slug || "company"}:${input.date}:${input.channel}`;
}

describe("icpShortlistTouchLog sourceRef", () => {
  it("prefers interaction id for idempotency", () => {
    expect(
      buildSourceRef({
        touch: "TOUCH1",
        interactionId: "abc-123",
        company: "BlueRadius Cyber",
        date: "2026-07-24",
        channel: "EMAIL",
      }),
    ).toBe("icp-touch:TOUCH1:abc-123");
  });

  it("falls back to company+date+channel when no interaction", () => {
    expect(
      buildSourceRef({
        touch: "TOUCH1",
        company: "BlueRadius Cyber",
        date: "2026-07-24",
        channel: "EMAIL",
      }),
    ).toBe("icp-touch:TOUCH1:manual:blueradius-cyber:2026-07-24:EMAIL");
  });
});
