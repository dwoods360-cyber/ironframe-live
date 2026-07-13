import { describe, expect, it } from "vitest";

import { withGetStartedAudioCacheBust } from "@/app/lib/getStartedAudioAsset";

describe("getStartedAudioAsset", () => {
  it("appends version query to mp3 paths", () => {
    expect(withGetStartedAudioCacheBust("/training-audio/get-started-welcome.mp3")).toMatch(
      /\?v=\d+$/,
    );
  });

  it("preserves existing query strings on mp3 paths", () => {
    expect(withGetStartedAudioCacheBust("/training-audio/foo.mp3?tenant=acorp")).toBe(
      "/training-audio/foo.mp3?tenant=acorp&v=4",
    );
  });
});
