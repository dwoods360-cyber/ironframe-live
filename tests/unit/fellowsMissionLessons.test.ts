import { describe, expect, it } from "vitest";

import {
  FELLOWS_MISSION_LESSONS,
  isFellowsLessonCheckCorrect,
} from "@/app/lib/fellows/missionLessons";

describe("fellows mission lessons", () => {
  it("defines teach + check for all four missions", () => {
    expect(FELLOWS_MISSION_LESSONS).toHaveLength(4);
    for (const lesson of FELLOWS_MISSION_LESSONS) {
      expect(lesson.teach.length).toBeGreaterThanOrEqual(2);
      expect(lesson.check.options.length).toBe(3);
      expect(lesson.check.options.some((o) => o.id === lesson.check.correctId)).toBe(true);
    }
  });

  it("includes an audit question for each mission", () => {
    for (const lesson of FELLOWS_MISSION_LESSONS) {
      expect(lesson.auditQuestion.length).toBeGreaterThan(20);
    }
  });

  it("accepts only the correct check option per mission", () => {
    for (const lesson of FELLOWS_MISSION_LESSONS) {
      expect(isFellowsLessonCheckCorrect(lesson.number, lesson.check.correctId)).toBe(true);
      const wrong = lesson.check.options.find((o) => o.id !== lesson.check.correctId);
      expect(wrong).toBeTruthy();
      expect(isFellowsLessonCheckCorrect(lesson.number, wrong!.id)).toBe(false);
    }
  });
});
