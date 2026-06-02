import "server-only";

export const ELECTRICITY_MAPS_CARBON_LATEST =
  "https://api.electricitymaps.com/v3/carbon-intensity/latest";

export const ELECTRICITY_MAPS_POWER_BREAKDOWN =
  "https://api.electricitymaps.com/v3/power-breakdown/latest";

const DEFAULT_TIMEOUT_MS = 12_000;

const STAGING_KEY_MARKERS = new Set([
  "mock_staging_key",
  "mock",
  "staging",
  "local_reserve_bypass_token",
]);

/** Dev/sustainability-fallback sentinel — never sent to vendor when staging path is active. */
export const LOCAL_RESERVE_BYPASS_TOKEN = "LOCAL_RESERVE_BYPASS_TOKEN";

/** Env keys checked in order — supports legacy / alternate container naming during tenant switches. */
const ELECTRICITY_MAPS_API_KEY_ENV_NAMES = [
  "ELECTRICITY_MAPS_API_KEY",
  "ELECTRICITY_MAPS__API_KEY",
  "_API_KEY",
  "_api_key",
  "ELECTRICITY_MAPS_RESERVE_KEY",
] as const;

function readEnvCredential(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  return raw || undefined;
}

export function isIronwatchSustainabilityFallbackEnabled(): boolean {
  const flag = process.env.IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED?.trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
}

/**
 * Resolves the active Electricity Maps token from canonical and fallback env aliases.
 * When `IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED` is on, returns a local bypass sentinel
 * so ingress never hard-fails with `missing _api_key` during tenant context switches.
 */
export function resolveActiveElectricityMapsApiKey(): string | undefined {
  for (const name of ELECTRICITY_MAPS_API_KEY_ENV_NAMES) {
    const key = readEnvCredential(name);
    if (key) return key;
  }
  if (isIronwatchSustainabilityFallbackEnabled()) {
    return LOCAL_RESERVE_BYPASS_TOKEN;
  }
  return undefined;
}

export type ElectricityMapsRequestAuth = {
  headers: Record<string, string>;
  /** Query params merged into zone-scoped GET (vendor + internal telemetry validators). */
  searchParams: Record<string, string>;
};

/**
 * Dual-signature auth footprint: Electricity Maps `auth-token` header plus `_api_key` query
 * for ingress layers that validate either shape during multi-tenant context switches.
 */
export function buildElectricityMapsRequestAuth(apiKey: string): ElectricityMapsRequestAuth {
  const activeApiKey = apiKey.trim() || resolveActiveElectricityMapsApiKey() || "";
  return {
    headers: activeApiKey ? { "auth-token": activeApiKey } : {},
    searchParams: activeApiKey ? { _api_key: activeApiKey } : {},
  };
}

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
  return resolveActiveElectricityMapsApiKey();
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

function readPositiveNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function parseCarbonIntensityGco2PerKwh(data: Record<string, unknown>): number | null {
  const direct =
    readPositiveNumber(data.carbonIntensity) ??
    readPositiveNumber(data.carbon_intensity) ??
    readPositiveNumber(data.gco2PerKwh);
  if (direct != null) return direct;

  const nested = data.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return parseCarbonIntensityGco2PerKwh(nested as Record<string, unknown>);
  }

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
  const activeApiKey = apiKey.trim() || resolveActiveElectricityMapsApiKey();
  if (!activeApiKey) {
    return {
      ok: false,
      reason: "missing_api_key",
      detail: "missing _api_key — no Electricity Maps credential in environment",
    };
  }

  if (
    activeApiKey === LOCAL_RESERVE_BYPASS_TOKEN ||
    !isProductionElectricityMapsKey(activeApiKey)
  ) {
    return {
      ok: false,
      reason: "staging_key",
      detail: "local sustainability bypass — skipping live Electricity Maps fetch",
    };
  }

  try {
    const auth = buildElectricityMapsRequestAuth(activeApiKey);
    if (!auth.searchParams._api_key) {
      return {
        ok: false,
        reason: "missing_api_key",
        detail: "missing _api_key — credential normalizer produced empty auth footprint",
      };
    }
    const url = new URL(endpoint);
    url.searchParams.set("zone", zone);
    for (const [key, value] of Object.entries(auth.searchParams)) {
      url.searchParams.set(key, value);
    }
    const res = await fetch(url.toString(), {
      headers: auth.headers,
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

const FALLBACK_LOG_COOLDOWN_MS = 60_000;
const recentFallbackLogAt = new Map<string, number>();

/** Audited console line for production log filters (Epic 9/5). Deduped — silent when sustainability fallback is on. */
export function logCarbonIngressFallback(input: {
  zone: string;
  reason: ElectricityMapsFallbackReason;
  detail?: string;
}): void {
  if (isIronwatchSustainabilityFallbackEnabled()) return;

  const dedupeKey = `${input.zone}:${input.reason}`;
  const now = Date.now();
  const lastAt = recentFallbackLogAt.get(dedupeKey) ?? 0;
  if (now - lastAt < FALLBACK_LOG_COOLDOWN_MS) return;
  recentFallbackLogAt.set(dedupeKey, now);

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
