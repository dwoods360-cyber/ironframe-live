import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "@/lib/supabase/middleware";
import { assertTenantAccess } from "@/app/utils/tenantIsolation";
import { isShadowPlaneActiveFromEnv } from "@/app/utils/shadowPlaneActive";
import { IRONTECH_STALE_LOCKDOWN_MESSAGE } from "@/app/config/sustainabilityStaleLockdown";
import {
  buildDeploymentQuarantineResponse,
  shouldBlockProductionIngress,
} from "@/app/lib/security/deploymentQuarantine";
import { isAuthPublicPath } from "@/app/utils/grcRouteMatch";

/** Read-only methods allowed on /api during Irontech State Freeze (Ironlock). */
const STALE_LOCKDOWN_READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function shadowPlaneRequestActive(request: NextRequest): boolean {
  if (isShadowPlaneActiveFromEnv()) return true;
  if (request.cookies.get("ironframe-simulation-mode")?.value === "1") return true;
  const hdr = request.headers.get("x-shadow-plane-active")?.trim().toLowerCase();
  return hdr === "1" || hdr === "true" || hdr === "yes";
}

/** Next.js App Router server actions ? must not 302 to /login or the client throws `TypeError: Failed to fetch`. */
function isNextServerActionPost(request: NextRequest): boolean {
  return request.method.toUpperCase() === "POST" && request.headers.has("next-action");
}

function middlewareSimulationBypass(request: NextRequest): boolean {
  const simSecret = process.env.SIMULATION_SECRET?.trim();
  const host = request.headers.get("host") ?? "";
  const isLocalHost =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]");
  const headerSecret = request.headers.get("x-simulation-secret")?.trim();
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  return (
    Boolean(simSecret && isLocalHost && (headerSecret === simSecret || bearer === simSecret)) ||
    shadowPlaneRequestActive(request)
  );
}

function internalTokenGatedApiPath(pathname: string): boolean {
  if (pathname.startsWith("/api/internal/cron/")) return true;
  if (pathname === "/api/cron/narrate") return true;
  if (pathname.startsWith("/api/internal/ironquery/export")) return true;
  return false;
}

function staleLockdownMutationBypassPath(pathname: string): boolean {
  if (pathname.startsWith("/api/internal/stale-lockdown-status")) return true;
  if (pathname.startsWith("/api/internal/operational-freeze-status")) return true;
  if (pathname.startsWith("/api/internal/quarantine-evaluate")) return true;
  if (pathname.startsWith("/api/internal/ironguard-violation")) return true;
  if (internalTokenGatedApiPath(pathname)) return true;
  /** Stale-data prolonged outage: Tripartite Vault + CISO + Staff waiver (resume grid-truth mutations). */
  if (pathname.startsWith("/api/grc/sustainability-stale-lockdown-waiver")) return true;
  /** Constitutional void: SYSTEM_REBIRTH + gold restoration (separate from sustainability 3-key waiver). */
  if (pathname.startsWith("/api/grc/constitutional-override")) return true;
  if (pathname.startsWith("/api/grc/constitutional-restoration")) return true;
  return false;
}

function shouldBlockIrontechReadOnlyLockdown(request: NextRequest): boolean {
  const p = request.nextUrl.pathname;
  if (staleLockdownMutationBypassPath(p)) return false;
  const m = request.method.toUpperCase();
  if (p.startsWith("/api/")) {
    return !STALE_LOCKDOWN_READ_METHODS.has(m);
  }
  if (request.headers.has("next-action") && m === "POST") {
    return true;
  }
  return false;
}

async function operationalMutationFreezeActive(request: NextRequest): Promise<boolean> {
  const secret =
    process.env.IRONFRAME_INTERNAL_GATES_SECRET?.trim() ||
    process.env.IRONFRAME_CRON_SECRET?.trim();
  if (!secret) return false;
  try {
    const url = new URL("/api/internal/operational-freeze-status", request.url);
    const r = await fetch(url, {
      headers: { "x-ironframe-internal-gates": secret },
      cache: "no-store",
    });
    if (!r.ok) return false;
    const j = (await r.json()) as { lockdown?: boolean };
    return j.lockdown === true;
  } catch {
    return false;
  }
}

function fireMiddlewareIronguardViolation(origin: string, payload: Record<string, unknown>): void {
  const secret =
    process.env.IRONFRAME_INTERNAL_GATES_SECRET?.trim() ||
    process.env.IRONFRAME_CRON_SECRET?.trim();
  if (!secret) return;
  const url = `${origin.replace(/\/$/, "")}/api/internal/ironguard-violation`;
  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ironframe-internal-gates": secret,
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

function quarantineMiddlewareBypassPath(pathname: string): boolean {
  if (pathname.startsWith("/api/internal/quarantine-evaluate")) return true;
  if (pathname.startsWith("/api/internal/operational-freeze-status")) return true;
  if (pathname.startsWith("/api/internal/stale-lockdown-status")) return true;
  if (pathname.startsWith("/api/internal/ironguard-violation")) return true;
  if (pathname.startsWith("/api/auth/callback")) return true;
  if (isAuthPublicPath(pathname)) return true;
  if (internalTokenGatedApiPath(pathname)) return true;
  return false;
}

async function fetchQuarantineIngressBlocked(
  origin: string,
  pathname: string,
  clientIp: string | undefined,
  userId: string | undefined,
): Promise<boolean> {
  if (quarantineMiddlewareBypassPath(pathname)) return false;
  const secret =
    process.env.IRONFRAME_INTERNAL_GATES_SECRET?.trim() ||
    process.env.IRONFRAME_CRON_SECRET?.trim();
  if (!secret) return false;
  if (!clientIp && !userId) return false;
  try {
    const url = new URL("/api/internal/quarantine-evaluate", origin);
    if (clientIp) url.searchParams.set("ip", clientIp);
    if (userId) url.searchParams.set("userId", userId);
    const r = await fetch(url.toString(), {
      headers: { "x-ironframe-internal-gates": secret },
      cache: "no-store",
    });
    if (!r.ok) return false;
    const j = (await r.json()) as { blocked?: boolean };
    return j.blocked === true;
  } catch {
    return false;
  }
}

function mergeSupabaseCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach(({ name, value }) => {
    target.cookies.set(name, value);
  });
  return target;
}

function redirectWithSupabaseCookies(
  supabaseResponse: NextResponse,
  url: URL,
): NextResponse {
  return mergeSupabaseCookies(supabaseResponse, NextResponse.redirect(url));
}

/**
 * Global: Supabase session refresh (`updateSession` on all matched routes).
 * API routes: same tenant cross-check as legacy `proxy.ts` (x-tenant-id / x-target-tenant-id / tenantUuid).
 */
export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // ==========================================
  // 1. PRODUCTION QUARANTINE PERIMETER
  // ==========================================
  // Localhost is whitelisted inside shouldBlockProductionIngress ? never early-return here;
  // that would skip Supabase session refresh, tenant isolation, and auth redirects below.
  if (shouldBlockProductionIngress(request, pathname)) {
    return buildDeploymentQuarantineResponse();
  }

  // ==========================================
  // 2. SUPABASE SESSION + PLATFORM GATES
  // ==========================================
  const supabaseResponse = await updateSession(request);

  const isLoginRoute = pathname === "/login";
  const isIntegrityRoute = pathname === "/integrity" || pathname.startsWith("/integrity/");
  const isForgotPasswordRoute = pathname === "/forgot-password";
  const isUnauthorizedRoute = pathname === "/unauthorized";
  const isResetPasswordRoute = pathname === "/reset-password";
  const isAuthCallbackRoute = pathname.startsWith("/api/auth/callback");
  const isAuthPublicRoute =
    isLoginRoute ||
    isForgotPasswordRoute ||
    isUnauthorizedRoute ||
    isResetPasswordRoute ||
    isAuthCallbackRoute;
  const isPublicHomeRoute = pathname === "/";
  /** Static documentation hub ? public read + protocol download (no tenant scope). */
  const isPublicDocsRoute =
    pathname === "/docs" ||
    pathname.startsWith("/docs/") ||
    pathname === "/api/docs/download-protocol" ||
    pathname === "/api/docs/download-matrix";
  /** IronBoard (:8082) server bridge ? tenant cookie / host header scoped; no browser session required. */
  const isBoardSharedContextRoute = pathname === "/api/board/shared-context";

  /** Common URL typo ? trailing period after `/dashboard/exports` yields 404 in App Router. */
  if (pathname === "/dashboard/exports.") {
    const fixed = request.nextUrl.clone();
    fixed.pathname = "/dashboard/exports";
    return NextResponse.redirect(fixed);
  }

  /** Strip empty `_api_key` query noise; inject reserve credential during sustainability fallback. */
  if (
    pathname.startsWith("/api/sustainability/") ||
    pathname.startsWith("/api/grc/carbon-pulse")
  ) {
    const rawKey = request.nextUrl.searchParams.get("_api_key");
    if (rawKey != null && !rawKey.trim()) {
      const fallbackOn = ["true", "1", "yes"].includes(
        (process.env.IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED ?? "").trim().toLowerCase(),
      );
      const sanitized = request.nextUrl.clone();
      sanitized.searchParams.delete("_api_key");
      if (fallbackOn) {
        const reserve =
          process.env.ELECTRICITY_MAPS_API_KEY?.trim() ||
          process.env.ELECTRICITY_MAPS_RESERVE_KEY?.trim() ||
          process.env._API_KEY?.trim() ||
          process.env._api_key?.trim() ||
          "LOCAL_RESERVE_BYPASS_TOKEN";
        sanitized.searchParams.set("_api_key", reserve);
      }
      return NextResponse.redirect(sanitized);
    }
  }

  const clientIpEarly =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    undefined;

  if (!middlewareSimulationBypass(request) && !quarantineMiddlewareBypassPath(pathname)) {
    let userIdEarly: string | undefined;
    const supabaseUrlEarly = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseAnonEarly = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (supabaseUrlEarly && supabaseAnonEarly) {
      const supaEarly = createServerClient(supabaseUrlEarly, supabaseAnonEarly, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      });
      const { data } = await supaEarly.auth.getUser();
      userIdEarly = data.user?.id?.trim() || undefined;
    }
    if (
      await fetchQuarantineIngressBlocked(
        request.nextUrl.origin,
        pathname,
        clientIpEarly,
        userIdEarly,
      )
    ) {
      const denied = NextResponse.json(
        { ok: false, error: "Ingress blocked by quarantine ledger (Ironguard)." },
        { status: 403 },
      );
      supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
        denied.cookies.set(name, value);
      });
      return denied;
    }
  }

  if (pathname.startsWith("/api/") && process.env.DISABLE_MULTI_TENANT_PROXY !== "true") {
    const activeTenantUuid = request.headers.get("x-tenant-id");
    const targetTenantUuid =
      request.headers.get("x-target-tenant-id") ?? request.nextUrl.searchParams.get("tenantUuid");

    const simSecret = process.env.SIMULATION_SECRET?.trim();
    const host = request.headers.get("host") ?? "";
    const isLocalHost =
      host.startsWith("localhost") ||
      host.startsWith("127.0.0.1") ||
      host.startsWith("[::1]");
    const headerSecret = request.headers.get("x-simulation-secret")?.trim();
    const auth = request.headers.get("authorization");
    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
    const simulationBypass =
      Boolean(simSecret && isLocalHost && (headerSecret === simSecret || bearer === simSecret)) ||
      shadowPlaneRequestActive(request);

    if (
      !simulationBypass &&
      targetTenantUuid &&
      !assertTenantAccess(activeTenantUuid, targetTenantUuid)
    ) {
      const clientIp =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip")?.trim() ||
        undefined;
      fireMiddlewareIronguardViolation(request.nextUrl.origin, {
        errorCode: "CROSS_TENANT_API_BLOCKED",
        sessionTenantUuid: activeTenantUuid ?? null,
        attemptedTenantUuid: targetTenantUuid,
        path: pathname,
        metadata: { source: "middleware", activeTenantUuid, targetTenantUuid, clientIp },
      });
      const denied = NextResponse.json(
        { ok: false, error: "Tenant isolation violation: cross-tenant API access denied." },
        { status: 403 },
      );
      supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
        denied.cookies.set(name, value);
      });
      return denied;
    }
  }

  if (
    shouldBlockIrontechReadOnlyLockdown(request) &&
    !middlewareSimulationBypass(request) &&
    (await operationalMutationFreezeActive(request))
  ) {
    const denied = NextResponse.json(
      { ok: false, error: IRONTECH_STALE_LOCKDOWN_MESSAGE },
      { status: 403 },
    );
    supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
      denied.cookies.set(name, value);
    });
    return denied;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnon) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // updateSession already handles cookie writes for this request cycle.
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ==========================================
  // 3. AUTH ENTRANCE CODES (core telemetry paths)
  // ==========================================

  // RULE A: Unauthenticated users targeting internal telemetry grids ? /login
  if (!user && isIntegrityRoute) {
    const loginUrl = new URL("/login", request.url);
    return redirectWithSupabaseCookies(supabaseResponse, loginUrl);
  }

  // RULE B: Authenticated users on /login ? Integrity Hub
  if (user && isLoginRoute) {
    const integrityUrl = new URL("/integrity", request.url);
    return redirectWithSupabaseCookies(supabaseResponse, integrityUrl);
  }

  if (!user && !isAuthPublicRoute) {
    if (isPublicDocsRoute || isPublicHomeRoute || isBoardSharedContextRoute) {
      return supabaseResponse;
    }
    // Cron endpoints are token-gated in their own route handlers.
    // Never redirect them to /login, or Vercel will return HTML fallback instead of JSON/401.
    if (internalTokenGatedApiPath(pathname)) {
      return supabaseResponse;
    }

    /** Shadow plane / simulation secret: allow local API live-fire without a browser session. */
    if (pathname.startsWith("/api/") && middlewareSimulationBypass(request)) {
      return supabaseResponse;
    }
    /** Server Actions: let RSC handle auth ? redirect HTML breaks `fetchServerAction` (apiClient fetch patch stack). */
    if (isNextServerActionPost(request)) {
      return supabaseResponse;
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return redirectWithSupabaseCookies(supabaseResponse, loginUrl);
  }

  if (user && isForgotPasswordRoute) {
    const integrityUrl = new URL("/integrity", request.url);
    return redirectWithSupabaseCookies(supabaseResponse, integrityUrl);
  }

  if (user && isUnauthorizedRoute) {
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  // Broad matcher ? tenant isolation, Ironguard, API cron gates, and dashboard auth all depend on this.
  // Do not narrow to only /, /login, /integrity or unauthenticated API/dashboard routes would leak.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
