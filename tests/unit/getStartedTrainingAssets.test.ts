import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { GET_STARTED_ORIENTATION_CUES } from "@/app/lib/getStartedOrientationCues";
import { GET_STARTED_STEP_VISUALS } from "@/app/lib/getStartedStepVisuals";
import {
  GET_STARTED_COMMAND_POST_SCREENSHOT,
  GET_STARTED_EXPORT_SCREENSHOT,
  TRAINING_SCREENSHOT_BASE,
} from "@/app/lib/getStartedTrainingAssets";

const PUBLIC_ROOT = path.join(process.cwd(), "public");

function publicFileExists(assetUrl: string): boolean {
  const relative = assetUrl.replace(/^\//, "").split("?")[0]!;
  return fs.existsSync(path.join(PUBLIC_ROOT, relative));
}

describe("getStartedTrainingAssets", () => {
  it("references git-tracked command post and export screenshots", () => {
    expect(publicFileExists(GET_STARTED_COMMAND_POST_SCREENSHOT)).toBe(true);
    expect(publicFileExists(GET_STARTED_EXPORT_SCREENSHOT)).toBe(true);
  });

  it("maps every Get Started step visual to an on-disk PNG", () => {
    for (const visual of Object.values(GET_STARTED_STEP_VISUALS)) {
      expect(visual.screenshotSrc.startsWith(TRAINING_SCREENSHOT_BASE)).toBe(true);
      expect(publicFileExists(visual.screenshotSrc)).toBe(true);
    }
  });

  it("maps every orientation cue screenshot to an on-disk PNG", () => {
    for (const cue of GET_STARTED_ORIENTATION_CUES) {
      expect(cue.screenshotSrc.startsWith(TRAINING_SCREENSHOT_BASE)).toBe(true);
      expect(publicFileExists(cue.screenshotSrc)).toBe(true);
    }
  });
});
