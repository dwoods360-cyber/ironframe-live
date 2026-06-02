import "server-only";

export const ELECTRICITY_MAPS_CARBON_LATEST =
  "https://api.electricitymaps.com/v3/carbon-intensity/latest";

export const ELECTRICITY_MAPS_POWER_BREAKDOWN =
  "https://api.electricitymaps.com/v3/power-breakdown/latest";

const DEFAULT_TIMEOUT_MS = 12_000;

const STAGING_KEY_MARKERS = new Set(["mock_staging_key", "mock", "staging"]);

export type ElectricityMapsFallbackReason =
  | "missing_api_key"
  | "staging_key"
  | "rate_limited"
  | "server_error"
  | "client_error"
  | "network_timeout"
  | "network_error"
  | "invalid_payload";

export type ElectricityMapsJsonResult =
  | { ok: true; data: Record<string, unknown>; httpStatus: number }
  | {
      ok: false;
      reason: ElectricityMapsFallbackReason;
      httpStatus?: number;
      detail?: string;
    };

export function getElectricityMapsApiKey(): string | undefined {
  const key = process.env.ELECTRICITY_MAPS_API_KEY?.trim();
  return key || undefined;
}

/** True when key is a real production token (not mock/staging placeholders). */
export function isProductionElectricityMapsKey(apiKey?: string): boolean {
  const k = apiKey?.trim() ?? "";
  if (!k) return false;
  return !STAGING_KEY_MARKERS.has(k.toLowerCase());
}

/** @deprecated alias — gridcore ledger uses staging baselines when this returns true */
export function isStagingElectricityMapsKey(apiKey: string | undefined): boolean {
  return !isProductionElectricityMapsKey(apiKey);
}

export function parseCarbonIntensityGco2PerKwh(data: Record<string, unknown>): number | null {
  const intensity =
    typeof data.carbonIntensity === "number"
      ? data.carbonIntensity
      : typeof data.carbon_intensity === "number"
        ? data.carbon_intensity
        : typeof data.gco2PerKwh === "number"
          ? data.gco2PerKwh
          : null;
  if (intensity != null && intensity > 0 && Number.isFinite(intensity)) return intensity;
  return null;
}

/**
 * Live HTTPS fetch to Electricity Maps zone endpoints.
 * Fail-closed: 429 / 5xx / timeout → structured error (caller falls back to forensic baseline).
 */
export async function fetchElectricityMapsJson(
  endpoint: string,
  zone: string,
  apiKey: string,
): Promise<ElectricityMapsJsonResult> {
  try {
    const url = new URL(endpoint);
    url.searchParams.set("zone", zone);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      cache: "no-store",
    });

    if (res.status === 429) {
      return {
        ok: false,
        reason: "rate_limited",
        httpStatus: 429,
        detail: "Electricity Maps rate limit (429)",
      };
    }
    if (res.status >= 500) {
      return {
        ok: false,
        reason: "server_error",
        httpStatus: res.status,
        detail: `Electricity Maps server error (${res.status})`,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        reason: "client_error",
        httpStatus: res.status,
        detail: `Electricity Maps client error (${res.status})`,
      };
    }

    const data = (await res.json()) as Record<string, unknown>;
    return { ok: true, data, httpStatus: res.status };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    const isTimeout =
      e instanceof Error &&
      (e.name === "TimeoutError" || e.name === "AbortError" || /timeout|aborted/i.test(detail));
    return {
      ok: false,
      reason: isTimeout ? "network_timeout" : "network_error",
      detail,
    };
  }
}

/** Audited console line for production log filters (Epic 9/5). */
export function logCarbonIngressFallback(input: {
  zone: string;
  reason: ElectricityMapsFallbackReason;
  detail?: string;
}): void {
  console.info(
    "[ironbloom-carbon-ingress]",
    JSON.stringify({
      zone: input.zone,
      fallback: "FORENSIC_BASELINE",
      reason: input.reason,
      detail: input.detail ?? null,
    }),
  );
}
