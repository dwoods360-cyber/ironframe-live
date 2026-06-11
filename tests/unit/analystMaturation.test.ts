import { describe, expect, it } from "vitest";
import {
  computeMaturationProgress,
  maturationDeepDiveEventId,
  maturationHitlReviewEventId,
  maturationThreatResolvedEventId,
} from "@/app/utils/analystMaturation";

describe("analystMaturation", () => {
  it("uses sector library size as denominator (typically 3)", () => {
    const progress = computeMaturationProgress([], "Healthcare");
    expect(progress.total).toBe(3);
    expect(progress.mastered).toBe(0);
    expect(progress.percent).toBe(0);
    expect(progress.isCertified).toBe(false);
  });

  it("increments mastery from operational events up to the denominator", () => {
    const events = [
      maturationDeepDiveEventId("hc-phi-extort"),
      maturationThreatResolvedEventId("threat-1"),
      maturationHitlReviewEventId("approval-1"),
    ];
    const progress = computeMaturationProgress(events, "Healthcare");
    expect(progress.mastered).toBe(3);
    expect(progress.percent).toBe(100);
    expect(progress.isCertified).toBe(true);
  });

  it("does not exceed denominator when extra events are recorded", () => {
    const events = [
      maturationDeepDiveEventId("a"),
      maturationDeepDiveEventId("b"),
      maturationDeepDiveEventId("c"),
      maturationHitlReviewEventId("d"),
    ];
    const progress = computeMaturationProgress(events, "Healthcare");
    expect(progress.mastered).toBe(3);
    expect(progress.percent).toBe(100);
  });
});
