import { describe, expect, it } from "vitest";

import {
  MAX_TRACKED_TOUCH_ORDINAL,
  buildCadenceTraceLine,
  nextTouchOrdinalFromPriorSends,
  parseCadenceTouch,
  touchStageFromOrdinal,
  withCadenceTraceLine,
} from "@/app/lib/salesTouchCadence";

const DISPATCHED_SUMMARY = [
  "[DISPATCHED SALES COURIER] client-isolated evidence — Certified NETS",
  "--- Authorized Text Dispatched ---",
  "Hi Robyn,",
  "",
  "Best,",
  "Dereck",
  "--- Trace Matrix ---",
  "Channel: EMAIL | To: rhowes@certified-nets.com | Transitioned By: Manual Admin Override | Original Log Ref: abc",
  "Resend Message ID: re_123",
].join("\n");

describe("touch ordinal rules", () => {
  it("maps prior send count to the next touch ordinal", () => {
    expect(nextTouchOrdinalFromPriorSends(0)).toBe(1);
    expect(nextTouchOrdinalFromPriorSends(1)).toBe(2);
    expect(nextTouchOrdinalFromPriorSends(2)).toBe(3);
    expect(nextTouchOrdinalFromPriorSends(5)).toBe(6);
  });

  it("treats negative / fractional counts as zero-floor integers", () => {
    expect(nextTouchOrdinalFromPriorSends(-3)).toBe(1);
    expect(nextTouchOrdinalFromPriorSends(1.9)).toBe(2);
  });

  it("clamps ordinals beyond the modelled cadence to TOUCH3", () => {
    expect(touchStageFromOrdinal(1)).toBe("TOUCH1");
    expect(touchStageFromOrdinal(2)).toBe("TOUCH2");
    expect(touchStageFromOrdinal(3)).toBe("TOUCH3");
    expect(touchStageFromOrdinal(9)).toBe("TOUCH3");
    expect(touchStageFromOrdinal(0)).toBe("TOUCH1");
    expect(MAX_TRACKED_TOUCH_ORDINAL).toBe(3);
  });

  it("never reports TOUCH1 for a contact that already had a send", () => {
    // Regression: the 2026-08-27 prep run nearly stacked a third email because
    // untagged dispatched rows read as "no touch yet".
    for (const priorSends of [1, 2, 3, 4]) {
      expect(touchStageFromOrdinal(nextTouchOrdinalFromPriorSends(priorSends))).not.toBe("TOUCH1");
    }
  });
});

describe("cadence tag parsing", () => {
  it("reads an explicit cadence tag case-insensitively", () => {
    expect(parseCadenceTouch("Cadence: TOUCH2")).toBe("TOUCH2");
    expect(parseCadenceTouch("cadence: touch3")).toBe("TOUCH3");
  });

  it("returns null for untagged legacy dispatched rows", () => {
    expect(parseCadenceTouch(DISPATCHED_SUMMARY)).toBeNull();
    expect(parseCadenceTouch("")).toBeNull();
    expect(parseCadenceTouch(null)).toBeNull();
  });

  it("ignores touch numbers outside the modelled cadence", () => {
    expect(parseCadenceTouch("Cadence: TOUCH4")).toBeNull();
  });
});

describe("withCadenceTraceLine", () => {
  it("stamps the cadence under the Channel/To trace line", () => {
    const stamped = withCadenceTraceLine(DISPATCHED_SUMMARY, "TOUCH2");
    const lines = stamped.split("\n");
    const markerIdx = lines.indexOf("--- Trace Matrix ---");

    expect(lines[markerIdx + 1]).toContain("Channel: EMAIL");
    expect(lines[markerIdx + 2]).toBe("Cadence: TOUCH2");
    expect(lines[markerIdx + 3]).toBe("Resend Message ID: re_123");
  });

  it("round-trips through the parser", () => {
    expect(parseCadenceTouch(withCadenceTraceLine(DISPATCHED_SUMMARY, "TOUCH3"))).toBe("TOUCH3");
  });

  it("is idempotent — never double-stamps or rewrites an existing tag", () => {
    const once = withCadenceTraceLine(DISPATCHED_SUMMARY, "TOUCH2");
    expect(withCadenceTraceLine(once, "TOUCH2")).toBe(once);
    expect(withCadenceTraceLine(once, "TOUCH3")).toBe(once);
    expect(once.match(/Cadence:/g)).toHaveLength(1);
  });

  it("appends when the summary has no Trace Matrix block", () => {
    const stamped = withCadenceTraceLine("[DISPATCHED SALES COURIER] bare row", "TOUCH1");
    expect(stamped.endsWith("\nCadence: TOUCH1")).toBe(true);
  });

  it("leaves the dispatched wire copy untouched", () => {
    const stamped = withCadenceTraceLine(DISPATCHED_SUMMARY, "TOUCH2");
    const wire = (s: string) =>
      s.split("--- Authorized Text Dispatched ---")[1]!.split("--- Trace Matrix ---")[0];
    expect(wire(stamped)).toBe(wire(DISPATCHED_SUMMARY));
  });

  it("builds a stable trace line", () => {
    expect(buildCadenceTraceLine("TOUCH1")).toBe("Cadence: TOUCH1");
  });
});
