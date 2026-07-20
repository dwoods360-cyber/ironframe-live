import { describe, expect, it } from "vitest";

import {
  parseTeamsTranscriptVtt,
  transcriptDelta,
} from "@/app/lib/server/teamsGraphTranscriptParse";

describe("teamsGraphTranscriptParse", () => {
  it("extracts spoken lines from VTT with speaker labels", () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
Jane Doe: Can we pilot this for ninety days?

00:00:05.000 --> 00:00:08.000
<v Host>Path B is the paid design-partner window.
`;
    expect(parseTeamsTranscriptVtt(vtt)).toBe(
      "Can we pilot this for ninety days? Path B is the paid design-partner window.",
    );
  });

  it("computes delta when transcript grows", () => {
    const prev = "Hello there";
    const next = "Hello there how are you";
    expect(transcriptDelta(prev, next)).toBe("how are you");
  });
});
