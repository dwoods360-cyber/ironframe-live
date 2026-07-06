import { describe, expect, it } from "vitest";

import { getStartedStepAudioSrc } from "@/app/lib/getStartedStepAudio";
import { resolveGetStartedWelcomeAudioSrc } from "@/app/lib/getStartedWelcomeAudio";

describe("get-started audio paths", () => {
  it("serves welcome audio outside the /docs App Router catch-all", () => {
    const src = resolveGetStartedWelcomeAudioSrc();
    expect(src).toBeTruthy();
    expect(src).not.toMatch(/^\/docs\//);
    expect(src).toBe("/training-audio/get-started-welcome.mp3");
  });

  it("serves step narration outside the /docs App Router catch-all", () => {
    const src = getStartedStepAudioSrc("quickstart");
    expect(src).not.toMatch(/^\/docs\//);
    expect(src).toBe("/training-audio/steps/quickstart.mp3");
  });
});
