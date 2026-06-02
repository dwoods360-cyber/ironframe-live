import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildElectricityMapsRequestAuth,
  fetchElectricityMapsJson,
  getElectricityMapsApiKey,
  LOCAL_RESERVE_BYPASS_TOKEN,
  logCarbonIngressFallback,
  resolveActiveElectricityMapsApiKey,
} from "@/app/services/ironbloom/electricityMapsClient";

describe("electricityMapsClient credential normalizer", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("resolveActiveElectricityMapsApiKey prefers ELECTRICITY_MAPS_API_KEY", () => {
    vi.stubEnv("ELECTRICITY_MAPS_API_KEY", "primary-key");
    vi.stubEnv("ELECTRICITY_MAPS_RESERVE_KEY", "reserve-key");
    expect(resolveActiveElectricityMapsApiKey()).toBe("primary-key");
    expect(getElectricityMapsApiKey()).toBe("primary-key");
  });

  it("resolveActiveElectricityMapsApiKey falls back to reserve alias", () => {
    delete process.env.ELECTRICITY_MAPS_API_KEY;
    vi.stubEnv("ELECTRICITY_MAPS_RESERVE_KEY", "reserve-key");
    expect(resolveActiveElectricityMapsApiKey()).toBe("reserve-key");
  });

  it("buildElectricityMapsRequestAuth emits auth-token header and _api_key query param", () => {
    const auth = buildElectricityMapsRequestAuth("zone-token");
    expect(auth.headers).toEqual({ "auth-token": "zone-token" });
    expect(auth.searchParams).toEqual({ _api_key: "zone-token" });
  });

  it("fetchElectricityMapsJson injects dual auth signatures on outbound GET", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ carbonIntensity: 380 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchElectricityMapsJson(
      "https://api.electricitymaps.com/v3/carbon-intensity/latest",
      "US-MIDW-MISO",
      "live-token",
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("zone=US-MIDW-MISO");
    expect(url).toContain("_api_key=live-token");
    expect(init.headers).toMatchObject({ "auth-token": "live-token" });
  });

  it("resolveActiveElectricityMapsApiKey returns bypass token when sustainability fallback is enabled", () => {
    delete process.env.ELECTRICITY_MAPS_API_KEY;
    delete process.env.ELECTRICITY_MAPS_RESERVE_KEY;
    vi.stubEnv("IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED", "true");
    expect(resolveActiveElectricityMapsApiKey()).toBe(LOCAL_RESERVE_BYPASS_TOKEN);
  });

  it("fetchElectricityMapsJson returns missing_api_key when no credential resolves", async () => {
    delete process.env.ELECTRICITY_MAPS_API_KEY;
    delete process.env.ELECTRICITY_MAPS_RESERVE_KEY;
    delete process.env._API_KEY;
    delete process.env._api_key;
    delete process.env.IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED;

    const result = await fetchElectricityMapsJson(
      "https://api.electricitymaps.com/v3/carbon-intensity/latest",
      "US-MIDW-MISO",
      "",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("missing_api_key");
      expect(result.detail).toContain("missing _api_key");
    }
  });

  it("logCarbonIngressFallback is silent when sustainability fallback is enabled", () => {
    vi.stubEnv("IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED", "true");
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    logCarbonIngressFallback({ zone: "US-GD", reason: "missing_api_key" });

    expect(infoSpy).not.toHaveBeenCalled();
    infoSpy.mockRestore();
  });
});
