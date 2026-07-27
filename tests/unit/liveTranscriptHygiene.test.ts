import { describe, expect, it } from "vitest";

import {
  buildWorkflowReviewSttPrompt,
  normalizeLiveTranscriptChunk,
} from "@/app/lib/operations/liveTranscriptHygiene";

describe("liveTranscriptHygiene", () => {
  it("strips standalone and embedded EMPTY silence tokens", () => {
    expect(normalizeLiveTranscriptChunk("EMPTY")).toBe("");
    expect(normalizeLiveTranscriptChunk("empty")).toBe("");
    expect(
      normalizeLiveTranscriptChunk(
        "What is the maximum number of clients we can load into the Ironframe system. EMPTY",
      ),
    ).toBe("What is the maximum number of clients we can load into the Ironframe system.");
    expect(
      normalizeLiveTranscriptChunk(
        "Path B. EMPTY. So we're going to go ahead and get started",
      ),
    ).toBe("Path B. So we're going to go ahead and get started");
  });

  it("still corrects Textbelt and July 25th mishears", () => {
    const cleaned = normalizeLiveTranscriptChunk(
      "meet on July 20 Fifth to discuss the SMS provider tax bill",
    );
    expect(cleaned).toContain("July 25th");
    expect(cleaned).toContain("Textbelt");
  });

  it("STT prompt forbids inventing Path B / workflow review talk-track", () => {
    const prompt = buildWorkflowReviewSttPrompt();
    expect(prompt).toMatch(/Do not invent/i);
    expect(prompt).toMatch(/Spelling hints only/i);
    expect(prompt).toMatch(/Preserve content nouns/i);
    expect(prompt).toMatch(/Never place the word EMPTY inside/i);
  });
});
