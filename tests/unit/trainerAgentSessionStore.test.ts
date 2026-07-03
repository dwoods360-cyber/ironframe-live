import { describe, expect, it } from "vitest";

import { normalizeTrainerLesson } from "@/app/store/trainerAgentSessionStore";

describe("normalizeTrainerLesson", () => {
  it("returns fallback for empty or whitespace-only payloads", () => {
    expect(normalizeTrainerLesson("")).toContain("empty lesson payload");
    expect(normalizeTrainerLesson("   ")).toContain("empty lesson payload");
    expect(normalizeTrainerLesson(undefined)).toContain("empty lesson payload");
  });

  it("preserves non-empty lesson text", () => {
    expect(normalizeTrainerLesson("  Step 1: open Integrity Hub.  ")).toBe("Step 1: open Integrity Hub.");
  });
});
