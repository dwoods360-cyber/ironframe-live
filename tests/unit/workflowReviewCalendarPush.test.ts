import { describe, expect, it } from "vitest";

import {
  dueAtForRecapPriority,
  sourceRefForRecapAction,
} from "@/app/lib/server/workflowReviewCalendarPush";

describe("workflowReviewCalendarPush helpers", () => {
  it("maps priorities to due dates", () => {
    const now = new Date("2026-07-20T12:00:00.000Z");
    const asap = dueAtForRecapPriority("now", now);
    expect(asap.getTime()).toBe(now.getTime() + 4 * 60 * 60 * 1000);

    const week = dueAtForRecapPriority("this_week", now);
    expect(week.getUTCDate()).toBe(23);

    const later = dueAtForRecapPriority("later", now);
    expect(later.getUTCDate()).toBe(3); // +14 days → Aug 3
  });

  it("builds stable sourceRef for idempotent calendar upserts", () => {
    const a = sourceRefForRecapAction("Western Alliance", "Send Path B order form");
    const b = sourceRefForRecapAction("Western Alliance", "Send Path B order form");
    const c = sourceRefForRecapAction("Western Alliance", "Different action");
    expect(a).toBe(b);
    expect(a).toMatch(/^wf-recap:western-alliance:/);
    expect(a).not.toBe(c);
  });
});
