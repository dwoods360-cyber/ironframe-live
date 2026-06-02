import { afterEach, describe, expect, it, vi } from "vitest";
import {
  IRONWATCH_CHECK_INTERVAL_MS,
  IRONWATCH_DEFAULT_ELECTRICITY_MAPS_ZONE,
  IRONWATCH_MIN_CONSECUTIVE_FAILURES,
  IRONWATCH_STALE_DATA_THRESHOLD_MS,
  pingElectricityMapsLive,
} from "@/src/services/ironwatch/apiHeartbeat";

describe("Ironwatch apiHeartbeat", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requires 16 consecutive 15m failures to reach 4h stale threshold", () => {
    expect(IRONWATCH_CHECK_INTERVAL_MS).toBe(15 * 60 * 1000);
    expect(IRONWATCH_STALE_DATA_THRESHOLD_MS).toBe(4 * 60 * 60 * 1000);
    expect(IRONWATCH_MIN_CONSECUTIVE_FAILURES).toBe(16);
  });

  it("pingElectricityMapsLive uses auth-token header and returns ok on valid payload", async () => {
    vi.stubEnv("ELECTRICITY_MAPS_API_KEY", "test-token");
    delete process.env.IRONWATCH_ELECTRICITY_MAPS_ZONE;
    delete process.env.IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ carbonIntensity: 412 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await pingElectricityMapsLive();
    expect(result.ok).toBe(true);
    expect(result.httpStatus).toBe(200);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({ "auth-token": "test-token" });
    const fetchUrl = String(fetchMock.mock.calls[0][0]);
    expect(fetchUrl).toContain("_api_key=test-token");
    expect(fetchUrl).toContain(
      `zone=${encodeURIComponent(IRONWATCH_DEFAULT_ELECTRICITY_MAPS_ZONE)}`,
    );
  });

  it("pingElectricityMapsLive returns ok when sustainability fallback is enabled and live ping fails", async () => {
    vi.stubEnv("ELECTRICITY_MAPS_API_KEY", "test-token");
    vi.stubEnv("IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED", "true");
    vi.stubEnv("IRONWATCH_FALLBACK_DURATION_LIMIT", "86400");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "bad request" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await pingElectricityMapsLive();
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.error).toContain("IRONWATCH_SUSTAINABILITY_FALLBACK");
  });
});
