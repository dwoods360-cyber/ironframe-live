import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isGeminiRateLimitError,
  parseGeminiRetryDelayMs,
  withGeminiRateLimitRetry,
} from "@/lib/geminiRetry";

describe("geminiRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("detects ApiError-style 429 responses", () => {
    expect(isGeminiRateLimitError({ status: 429, message: "Too Many Requests" })).toBe(true);
    expect(isGeminiRateLimitError(new Error("RESOURCE_EXHAUSTED quota exceeded"))).toBe(true);
    expect(isGeminiRateLimitError(new Error("invalid API key"))).toBe(false);
  });

  it("parses server retry hints from error payloads", () => {
    const err = new Error('Please retry in 3.443825673s. "retryDelay": "3s"');
    expect(parseGeminiRetryDelayMs(err)).toBe(3444);
  });

  it("retries rate-limited operations with backoff then succeeds", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce({ status: 429, message: "Please retry in 1s" })
      .mockResolvedValueOnce("ok");

    const promise = withGeminiRateLimitRetry(operation, { label: "test-op", baseDelayMs: 500 });
    await vi.advanceTimersByTimeAsync(1_500);
    await expect(promise).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-rate-limit failures", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("bad request"));
    await expect(withGeminiRateLimitRetry(operation)).rejects.toThrow("bad request");
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
