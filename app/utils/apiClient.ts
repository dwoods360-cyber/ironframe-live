import { getIronguardEffectiveTenant, setIronguardEffectiveTenant } from "@/app/utils/ironguardSession";
import { logIsolationSentinelBlocked } from "@/app/utils/isolationSentinelLog";
import { appendAuditLog } from "@/app/utils/auditLogger";
import { useRiskStore } from "@/app/store/riskStore";
import { getSystemConfigSnapshot } from "@/app/store/systemConfigStore";
import { isShadowPlaneUiActive } from "@/app/utils/shadowPlaneActive";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

export const IRONGUARD_BREACH =
  "[ 🚫 IRONGUARD BREACH ] | UNAUTHORIZED CROSS-TENANT FETCH BLOCKED.";

export const IRONGUARD_NO_TENANT =
  "[ 🚫 IRONGUARD ] | FETCH BLOCKED: NO TENANT CONTEXT.";

export { setIronguardEffectiveTenant, getIronguardEffectiveTenant };

/** Paths that remain callable without a resolved tenant session (infra probes only). */
const TENANT_OPTIONAL_API_PATHS = ["/api/health"];

function isTenantOptionalApiPath(pathname: string): boolean {
  return TENANT_OPTIONAL_API_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function normalizeUuidHeader(v: string | null): string | null {
  if (v == null) return null;
  const t = v.trim();
  if (!t) return null;
  return t.toLowerCase();
}

/**
 * Command Center “global” routes leave `ironframe-tenant` / path tenant unset; simulation + shadow plane still need
 * a stable UUID for `x-tenant-id` (matches server {@link assertIronguardApiTenantOr403} Medshield fallback).
 */
function ironguardShadowPlaneBypassesMissingSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return getSystemConfigSnapshot().isSimulationMode === true || isShadowPlaneUiActive();
  } catch {
    return isShadowPlaneUiActive();
  }
}

function resolveEffectiveTenantForIronguardFetch(): string | null {
  const fromSession = getIronguardEffectiveTenant();
  if (fromSession) return fromSession;
  if (ironguardShadowPlaneBypassesMissingSession()) {
    return TENANT_UUIDS.medshield;
  }
  return null;
}

function getUrlString(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  return "";
}

function getMethod(input: RequestInfo | URL, init?: RequestInit): string {
  const m = init?.method ?? (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET");
  return String(m || "GET").toUpperCase();
}

/**
 * Same-origin `/api` reads/writes: inject `x-tenant-id` from the secure session and refuse calls without tenant context.
 */
export function applyIronguardToFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): [RequestInfo | URL, RequestInit | undefined] {
  if (typeof window === "undefined") return [input, init];

  let pathname = "";
  try {
    const urlStr = getUrlString(input);
    const u = new URL(urlStr, window.location.origin);
    if (u.origin !== window.location.origin) return [input, init];
    pathname = u.pathname;
  } catch {
    return [input, init];
  }

  if (!pathname.startsWith("/api")) return [input, init];

  const method = getMethod(input, init);
  if (method === "OPTIONS" || method === "HEAD") return [input, init];

  if (isTenantOptionalApiPath(pathname)) return [input, init];

  let effective = resolveEffectiveTenantForIronguardFetch();
  /** Last-resort internal authorized scope — never emit IRONGUARD FETCH BLOCKED for shadow/sim builds. */
  if (!effective && ironguardShadowPlaneBypassesMissingSession()) {
    effective = TENANT_UUIDS.medshield;
  }
  if (!effective) {
    logIsolationSentinelBlocked({
      reasonCode: "NO_TENANT_CONTEXT",
      path: pathname,
      method,
      effectiveTenantUuid: null,
      requestedTenantUuid: null,
    });
    throw new Error(IRONGUARD_NO_TENANT);
  }
  if (!getIronguardEffectiveTenant() && ironguardShadowPlaneBypassesMissingSession()) {
    setIronguardEffectiveTenant(effective);
  }

  const headers = new Headers();
  if (typeof Request !== "undefined" && input instanceof Request) {
    input.headers.forEach((value, key) => headers.set(key, value));
  }
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  headers.set("x-tenant-id", effective);

  if (typeof Request !== "undefined" && input instanceof Request) {
    const next = new Request(input, {
      ...init,
      headers,
    });
    return [next, undefined];
  }

  return [input, { ...init, headers }];
}

/**
 * Any same-origin `/api` request that carries tenant scope headers must align with
 * {@link getIronguardEffectiveTenant} (Command Center cookie + path + dev override).
 */
export function assertIronguardBeforeFetch(input: RequestInfo | URL, init?: RequestInit): void {
  if (typeof window === "undefined") return;

  let urlStr = "";
  try {
    if (typeof input === "string") {
      urlStr = input;
    } else if (input instanceof URL) {
      urlStr = input.href;
    } else if (typeof Request !== "undefined" && input instanceof Request) {
      urlStr = input.url;
    }
  } catch {
    return;
  }

  let pathname = "";
  try {
    const u = new URL(urlStr, window.location.origin);
    if (u.origin !== window.location.origin) return;
    pathname = u.pathname;
  } catch {
    return;
  }

  if (!pathname.startsWith("/api")) return;

  const method = getMethod(input, init);

  const headers = new Headers();
  if (typeof Request !== "undefined" && input instanceof Request) {
    input.headers.forEach((value, key) => {
      headers.set(key, value);
    });
  }
  new Headers(init?.headers).forEach((value, key) => {
    headers.set(key, value);
  });

  const tgt = normalizeUuidHeader(headers.get("x-target-tenant-id"));
  const xtid = normalizeUuidHeader(headers.get("x-tenant-id"));

  if (tgt && xtid && tgt !== xtid) {
    logIsolationSentinelBlocked({
      reasonCode: "HEADER_CONFLICT",
      path: pathname,
      method,
      effectiveTenantUuid: xtid,
      requestedTenantUuid: tgt,
    });
    throw new Error(IRONGUARD_BREACH);
  }

  const requested = tgt ?? xtid;
  if (!requested) return;

  let effective = resolveEffectiveTenantForIronguardFetch();
  if (!effective && ironguardShadowPlaneBypassesMissingSession()) {
    effective = TENANT_UUIDS.medshield;
  }
  if (!effective) {
    logIsolationSentinelBlocked({
      reasonCode: "REQUESTED_TENANT_NO_EFFECTIVE",
      path: pathname,
      method,
      effectiveTenantUuid: null,
      requestedTenantUuid: requested,
    });
    throw new Error(IRONGUARD_BREACH);
  }
  if (requested !== effective) {
    logIsolationSentinelBlocked({
      reasonCode: "TENANT_MISMATCH",
      path: pathname,
      method,
      effectiveTenantUuid: effective,
      requestedTenantUuid: requested,
    });
    throw new Error(IRONGUARD_BREACH);
  }
}

function getNativeFetch(): typeof fetch {
  if (typeof window !== "undefined") {
    const w = window as Window & { __IRONGUARD_NATIVE_FETCH__?: typeof fetch };
    if (typeof w.__IRONGUARD_NATIVE_FETCH__ === "function") {
      return w.__IRONGUARD_NATIVE_FETCH__;
    }
    return window.fetch.bind(window);
  }
  return globalThis.fetch.bind(globalThis);
}

/**
 * Shadow / simulation plane: never swallow 401/403 — surface to console + Audit Intelligence (TAS logging directive).
 */
async function maybeLogShadowPlaneApiFailure(input: RequestInfo | URL, res: Response): Promise<void> {
  if (typeof window === "undefined") return;
  if (res.ok) return;
  if (res.status !== 401 && res.status !== 403) return;
  const shadowPlane =
    getSystemConfigSnapshot().isSimulationMode || isShadowPlaneUiActive();
  if (!shadowPlane) return;

  const urlStr = getUrlString(input);
  let pathname = urlStr;
  try {
    pathname = new URL(urlStr, window.location.origin).pathname;
  } catch {
    /* keep urlStr */
  }

  let snippet = "";
  try {
    snippet = (await res.clone().text()).slice(0, 480);
  } catch {
    snippet = "";
  }

  console.warn("[Ironframe Shadow Plane] API auth failure:", res.status, pathname, snippet || "(no body)");

  Promise.resolve().then(() => {
    appendAuditLog({
      action_type: "SYSTEM_WARNING",
      log_type: "GRC",
      metadata_tag: "SHADOW_PLANE|API_FETCH_AUTH_FAIL",
      description: `[ 🔭 SHADOW PLANE · HTTP ${res.status} ] ${pathname}${snippet ? ` — ${snippet}` : ""}`,
    });
  });
}

/** POST handlers set this when DB-backed state changed — triggers dashboard + boards refetch from listeners. */
function notifyClientRefreshIfNeeded(res: Response): void {
  if (typeof window === "undefined") return;
  const v = res.headers.get("x-ironframe-client-refresh");
  if (v !== "1") return;
  window.dispatchEvent(new CustomEvent("ironframe:dashboard-refetch"));
  void useRiskStore.getState().refreshActiveThreatsFromDb().catch(() => undefined);
}

/** Guarded fetch — injects tenant header, enforces session, then validates cross-tenant misuse. */
export async function ironguardFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const [ni, niInit] = applyIronguardToFetch(input, init);
  assertIronguardBeforeFetch(ni, niInit);
  const res = await getNativeFetch()(ni, niInit as RequestInit);
  void maybeLogShadowPlaneApiFailure(ni, res);
  notifyClientRefreshIfNeeded(res);
  return res;
}

/**
 * Patches `window.fetch` once so bare `/api` calls receive Ironguard injection + enforcement.
 */
export function installIronguardFetchInterceptor(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { __IRONGUARD_FETCH_PATCHED__?: boolean; __IRONGUARD_NATIVE_FETCH__?: typeof fetch };
  if (w.__IRONGUARD_FETCH_PATCHED__) return;
  w.__IRONGUARD_FETCH_PATCHED__ = true;
  w.__IRONGUARD_NATIVE_FETCH__ = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const [ni, niInit] = applyIronguardToFetch(input, init);
    assertIronguardBeforeFetch(ni, niInit);
    const res = await w.__IRONGUARD_NATIVE_FETCH__!(ni, niInit);
    void maybeLogShadowPlaneApiFailure(ni, res);
    notifyClientRefreshIfNeeded(res);
    return res;
  };
}
