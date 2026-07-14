import { describe, expect, it, vi, afterEach } from "vitest";

import { inspectGeminiApiKeyShape } from "./geminiCredentialHealth.js";

describe("inspectGeminiApiKeyShape", () => {
  it("accepts a clean AIza key", () => {
    const key = `AIza${"x".repeat(35)}`;
    const result = inspectGeminiApiKeyShape(key);
    expect(result.ok).toBe(true);
    expect(result.reason).toBeNull();
  });

  it("rejects missing keys", () => {
    expect(inspectGeminiApiKeyShape(undefined).ok).toBe(false);
    expect(inspectGeminiApiKeyShape("").reason).toMatch(/missing/i);
  });

  it("rejects email-mangled deploy artifacts", () => {
    const mangled = `AIza${"x".repeat(35)}=deployer@ironframe-prod.iam.gserviceaccount.com`;
    const result = inspectGeminiApiKeyShape(mangled);
    expect(result.ok).toBe(false);
    expect(result.looksEmailLike).toBe(true);
  });

  it("rejects abnormal lengths", () => {
    expect(inspectGeminiApiKeyShape("AIzaShort").ok).toBe(false);
  });
});

describe("buildIronboardReadiness", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.GOOGLE_API_KEY;
    delete process.env.IRONFRAME_CORE_ORIGIN;
  });

  it("marks not ready when core telemetry is unreachable", async () => {
    process.env.GOOGLE_API_KEY = `AIza${"y".repeat(35)}`;
    process.env.IRONFRAME_CORE_ORIGIN = "https://example.invalid";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("fetch failed")),
    );

    const { buildIronboardReadiness } = await import("./geminiCredentialHealth.js");
    const snapshot = await buildIronboardReadiness({ probeGemini: false });
    expect(snapshot.geminiKey.ok).toBe(true);
    expect(snapshot.coreTelemetry.ok).toBe(false);
    expect(snapshot.ready).toBe(false);
  });
});
