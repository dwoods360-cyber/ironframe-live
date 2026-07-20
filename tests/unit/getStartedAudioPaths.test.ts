import { describe, expect, it } from "vitest";

import { withGetStartedAudioCacheBust } from "@/app/lib/getStartedAudioAsset";
import { getStartedStepAudioSrc } from "@/app/lib/getStartedStepAudio";
import { resolveGetStartedWelcomeAudioSrc } from "@/app/lib/getStartedWelcomeAudio";

describe("get-started audio paths", () => {
  it("serves welcome audio outside the /docs App Router catch-all", () => {
    const src = resolveGetStartedWelcomeAudioSrc();
    expect(src).toBeTruthy();
    expect(src).not.toMatch(/^\/docs\//);
    expect(src).toBe("/training-audio/get-started-welcome.mp3?v=6");
  });

  it("serves step narration outside the /docs App Router catch-all", () => {
    const src = getStartedStepAudioSrc("quickstart");
    expect(src).not.toMatch(/^\/docs\//);
    expect(src).toBe("/training-audio/steps/quickstart.mp3?v=6");
  });

  it("cache-busts mp3 URLs only", () => {
    expect(withGetStartedAudioCacheBust("/training-audio/foo.mp3")).toBe(
      "/training-audio/foo.mp3?v=6",
    );
    expect(withGetStartedAudioCacheBust("/orientation/screencast.mp4")).toBe(
      "/orientation/screencast.mp4",
    );
  });
});
