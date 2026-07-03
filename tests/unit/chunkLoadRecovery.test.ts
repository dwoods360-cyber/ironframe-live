import { describe, expect, it } from "vitest";

import { isChunkLoadError } from "@/app/utils/chunkLoadRecovery";

describe("chunkLoadRecovery", () => {
  it("detects ChunkLoadError by name and message", () => {
    expect(isChunkLoadError(new Error("Loading chunk 123 failed"))).toBe(true);
    expect(isChunkLoadError({ name: "ChunkLoadError", message: "x" })).toBe(false);
    const err = new Error("failed");
    err.name = "ChunkLoadError";
    expect(isChunkLoadError(err)).toBe(true);
  });
});
