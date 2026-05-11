import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { TENANT_UUIDS, type TenantKey } from "@/app/utils/tenantIsolation";
import { isShadowPlaneActiveFromEnv } from "@/app/utils/shadowPlaneActive";

const SIMULATION_MODE_COOKIE = "ironframe-simulation-mode";

/** Bot / CLI simulation clients may send without `ironframe-tenant`; pair with `x-tenant-id` + Ironguard mismatch bypass. */
const HEADER_SIMULATION_MODE = "x-ironframe-simulation-mode";
const HEADER_SHADOW_PLANE_ACTIVE = "x-shadow-plane-active";

function headerTruthy(request: NextRequest, name: string): boolean {
  const v = request.headers.get(name)?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Shadow / simulation plane: cookie, env, or explicit stress-test headers. */
function isShadowPlaneSessionRequest(request: NextRequest): boolean {
  if (isShadowPlaneActiveFromEnv()) return true;
  if (request.cookies.get(SIMULATION_MODE_COOKIE)?.value === "1") return true;
  if (headerTruthy(request, HEADER_SIMULATION_MODE)) return true;
  if (headerTruthy(request, HEADER_SHADOW_PLANE_ACTIVE)) return true;
  return false;
}

const SLUGS = new Set<TenantKey>(["medshield", "vaultbank", "gridcore", "defense"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const IRONFRAME_TENANT_COOKIE = "ironframe-tenant";
/** Keep dev/shadow tenant aligned with RLS for the browser session (no extra Ironguard client round-trips). */
const SHADOW_TENANT_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

async function persistShadowPlaneTenantCookie(tenantUuid: string): Promise<void> {
  const store = await cookies();
  store.set(IRONFRAME_TENANT_COOKIE, tenantUuid, {
    path: "/",
    sameSite: "lax",
    maxAge: SHADOW_TENANT_COOKIE_MAX_AGE_SEC,
    httpOnly: false,
  });
}

function normalizeUuid(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Resolves `ironframe-tenant` cookie to canonical tenant UUID (slug or UUID).
 * Returns null when cookie absent or unrecognized.
 */
export async function getIronframeSessionTenantUuidFromCookies(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get("ironframe-tenant")?.value?.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (SLUGS.has(lower as TenantKey)) {
    return TENANT_UUIDS[lower as TenantKey];
  }
  if (UUID_RE.test(raw)) {
    return normalizeUuid(raw);
  }
  return null;
}

/**
 * Ironguard API enforcement: when the browser session already binds a tenant UUID via cookie,
 * `x-tenant-id` **must** match or the response is **403**.
 * When cookie is absent, the header UUID is accepted for the handler (bootstrap / edge cases).
 * **`SHADOW_PLANE_ACTIVE`**: internal authorized dev scope — always Medshield (5c420f5a-…) so Irontech Chaos never hits 401/403 tenant walls.
 * Otherwise: simulation cookie / headers use the same bypass rules below.
 */
export async function assertIronguardApiTenantOr403(request: NextRequest): Promise<
  | { ok: true; tenantUuid: string }
  | { ok: false; response: NextResponse }
> {
  if (isShadowPlaneActiveFromEnv()) {
    const uuid = TENANT_UUIDS.medshield;
    await persistShadowPlaneTenantCookie(uuid);
    return { ok: true, tenantUuid: uuid };
  }

  const headerRaw = request.headers.get("x-tenant-id")?.trim();
  /** Shadow / simulation GETs often lack a production session cookie; authorize Medshield for dashboard/API reads (RLS + Irontech Chaos). */
  if (!headerRaw) {
    if (isShadowPlaneSessionRequest(request)) {
      const uuid = TENANT_UUIDS.medshield;
      await persistShadowPlaneTenantCookie(uuid);
      return { ok: true, tenantUuid: uuid };
    }
    return {
      ok: false,
      response: NextResponse.json({ error: "Tenant context required. Send x-tenant-id (UUID)." }, { status: 401 }),
    };
  }

  const headerNorm = normalizeUuid(headerRaw);
  if (!UUID_RE.test(headerNorm)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Ironguard: invalid x-tenant-id format." }, { status: 400 }),
    };
  }

  const sessionUuid = await getIronframeSessionTenantUuidFromCookies();
  if (sessionUuid != null && sessionUuid !== headerNorm) {
    /** TAS §5 + §4.3: internal simulation / SHADOW_PLANE_ACTIVE — honor declared `x-tenant-id` over stale cookie mismatch. */
    if (isShadowPlaneSessionRequest(request)) {
      await persistShadowPlaneTenantCookie(headerNorm);
      return { ok: true, tenantUuid: headerNorm };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Ironguard: request tenant does not match authenticated session tenant." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, tenantUuid: headerNorm };
}
