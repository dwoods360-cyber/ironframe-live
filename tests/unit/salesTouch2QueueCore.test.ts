import { describe, expect, it } from "vitest";

import { touch2ReAnchorFor } from "@/app/lib/salesTouch2ReAnchors";
import {
  addCalendarDays,
  computeTouch2DueStatus,
  TOUCH2_EARLIEST_OFFSET_DAYS,
} from "@/app/lib/server/salesTouch2QueueCore";

describe("salesTouch2QueueCore helpers", () => {
  it("opens Touch 2 window at day 4 after Touch 1", () => {
    const touch1 = new Date("2026-08-17T17:44:00.000Z");
    const earliest = addCalendarDays(touch1, TOUCH2_EARLIEST_OFFSET_DAYS);
    expect(earliest.toISOString()).toBe("2026-08-21T17:44:00.000Z");
  });

  it("marks due YES when now is past earliest and only one dispatch", () => {
    const touch1 = new Date("2026-08-17T17:44:00.000Z");
    expect(
      computeTouch2DueStatus({
        touch1SentAt: touch1,
        now: new Date("2026-08-24T12:00:00.000Z"),
        dispatchCount: 1,
      }),
    ).toBe("YES");
  });

  it("marks WAIT before day 4", () => {
    const touch1 = new Date("2026-08-24T16:41:00.000Z");
    expect(
      computeTouch2DueStatus({
        touch1SentAt: touch1,
        now: new Date("2026-08-24T18:00:00.000Z"),
        dispatchCount: 1,
      }),
    ).toBe("WAIT");
  });

  it("marks DONE when a second DISPATCH already exists", () => {
    expect(
      computeTouch2DueStatus({
        touch1SentAt: new Date("2026-08-17T17:44:00.000Z"),
        now: new Date("2026-08-24T12:00:00.000Z"),
        dispatchCount: 2,
      }),
    ).toBe("DONE");
  });
});

describe("touch2ReAnchorFor", () => {
  it("matches by email", () => {
    const hit = touch2ReAnchorFor({
      email: "jbohrer@abacusgroupllc.com",
      company: "Abacus",
    });
    expect(hit?.motion).toContain("AbacusFlex");
    expect(hit?.reAnchor).toMatch(/Abacus/);
  });
});
