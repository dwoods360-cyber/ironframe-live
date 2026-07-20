import { describe, expect, it } from "vitest";

import { calendarDaysUntilDue, parseRemindersSent } from "@/app/lib/opsScheduleMath";

describe("opsScheduleCore calendar math", () => {
  it("counts whole UTC days until due", () => {
    const now = new Date("2026-07-17T15:00:00.000Z");
    expect(calendarDaysUntilDue(new Date("2026-07-20T17:00:00.000Z"), now)).toBe(3);
    expect(calendarDaysUntilDue(new Date("2026-07-19T01:00:00.000Z"), now)).toBe(2);
    expect(calendarDaysUntilDue(new Date("2026-07-18T23:59:00.000Z"), now)).toBe(1);
    expect(calendarDaysUntilDue(new Date("2026-07-17T08:00:00.000Z"), now)).toBe(0);
    expect(calendarDaysUntilDue(new Date("2026-07-16T08:00:00.000Z"), now)).toBe(-1);
  });

  it("parses reminder ledger keys", () => {
    expect(parseRemindersSent({ t3: "2026-07-01T00:00:00.000Z", junk: 1 })).toEqual({
      t3: "2026-07-01T00:00:00.000Z",
    });
    expect(parseRemindersSent(null)).toEqual({});
  });
});
