import { describe, expect, it } from "vitest";

import {
  GET_STARTED_ORIENTATION_CUES,
  resolveOrientationCueIndex,
} from "@/app/lib/getStartedOrientationCues";

describe("getStartedOrientationCues", () => {
  it("resolves cue index from playback time", () => {
    expect(resolveOrientationCueIndex(GET_STARTED_ORIENTATION_CUES, 0)).toBe(0);
    expect(resolveOrientationCueIndex(GET_STARTED_ORIENTATION_CUES, 27.9)).toBe(0);
    expect(resolveOrientationCueIndex(GET_STARTED_ORIENTATION_CUES, 28)).toBe(1);
    expect(resolveOrientationCueIndex(GET_STARTED_ORIENTATION_CUES, 150)).toBe(4);
    expect(resolveOrientationCueIndex(GET_STARTED_ORIENTATION_CUES, 155)).toBe(5);
    expect(resolveOrientationCueIndex(GET_STARTED_ORIENTATION_CUES, 999)).toBe(
      GET_STARTED_ORIENTATION_CUES.length - 1,
    );
  });

  it("defines a cue for each major script section", () => {
    expect(GET_STARTED_ORIENTATION_CUES.length).toBeGreaterThanOrEqual(8);
    expect(GET_STARTED_ORIENTATION_CUES.every((cue) => cue.screenshotSrc.startsWith("/docs/"))).toBe(
      true,
    );
  });
});
