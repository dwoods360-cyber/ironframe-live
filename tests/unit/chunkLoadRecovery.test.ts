import { describe, expect, it } from "vitest";

import {
  clearClientDriftReloadLatch,
  hasClientDriftReloadAlreadyAttempted,
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
    (digestOnly as Error & { digest?: string }).digest = "1456490624";
    // Digest-only RSC failures are real render bugs — not auto-reload "stale deploy".
    expect(isStaleDeploymentClientError(digestOnly)).toBe(false);
    expect(isRecoverableClientDriftError(digestOnly)).toBe(false);
  });

  it("tracks the one-shot reload latch in sessionStorage when available", () => {
    const store = new Map<string, string>();
    const prev = globalThis.sessionStorage;
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    });
    expect(hasClientDriftReloadAlreadyAttempted()).toBe(false);
    store.set("ironframe-chunk-reload-once", "1");
    expect(hasClientDriftReloadAlreadyAttempted()).toBe(true);
    clearClientDriftReloadLatch();
    expect(hasClientDriftReloadAlreadyAttempted()).toBe(false);
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: prev,
    });
  });
});
