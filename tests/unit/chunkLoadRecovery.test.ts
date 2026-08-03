import { describe, expect, it } from "vitest";

import {
  isChunkLoadError,
  isRecoverableClientDriftError,
  isStaleDeploymentClientError,
} from "@/app/utils/chunkLoadRecovery";

describe("chunkLoadRecovery", () => {
  it("detects ChunkLoadError by name and message", () => {
    expect(isChunkLoadError(new Error("Loading chunk 123 failed"))).toBe(true);
    expect(isChunkLoadError({ name: "ChunkLoadError", message: "x" })).toBe(false);
    const err = new Error("failed");
    err.name = "ChunkLoadError";
    expect(isChunkLoadError(err)).toBe(true);
  });

  it("detects stale Server Action / deploy client drift", () => {
    expect(
      isStaleDeploymentClientError(
        new Error(
          'Failed to find Server Action "x". This request might be from an older or newer deployment. Original error: Cannot read properties of undefined (reading \'workers\')',
        ),
      ),
    ).toBe(true);
    expect(isRecoverableClientDriftError(new Error("Loading chunk 9 failed"))).toBe(true);
    expect(isStaleDeploymentClientError(new Error("prisma timeout"))).toBe(false);

    const digestOnly = new Error("An error occurred in the Server Components render.");
    (digestOnly as Error & { digest?: string }).digest = "abc123";
    expect(isStaleDeploymentClientError(digestOnly)).toBe(true);
  });
});
