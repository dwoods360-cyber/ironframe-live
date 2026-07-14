import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession, withPathnameRequestHeaders } from "@/lib/supabase/middleware";
import { assertTenantAccess } from "@/app/utils/tenantIsolation";
import { isShadowPlaneActiveFromEnv } from "@/app/utils/shadowPlaneActive";
import { IRONTECH_STALE_LOCKDOWN_MESSAGE } from "@/app/config/sustainabilityStaleLockdown";
import {
  buildDeploymentQuarantineResponse,
  isStripeWebhookIngressPath,
  shouldBlockProductionIngress,
} from "@/app/lib/security/deploymentQuarantine";
import { isAuthPublicPath, isInfraHealthPath, isIronleadsIngressPath, isPublicCloudIngressPath, isPublicRoute, isSalesteamIngressPath, isSuccessTeamIngressPath, isSupportTeamIngressPath } from "@/app/utils/grcRouteMatch";
import { resolveAuthNextPathForHost } from "@/app/lib/auth/publicAppUrl";
import { isAdminOnboardingPath } from "@/app/lib/auth/adminOnboardingRoute";
import { tenantSlugFromHost, buildTenantSubdomainOrigin } from "@/app/lib/tenantSubdomain";
import { browserFacingUrl } from "@/app/lib/middlewareRequestOrigin";
import { applySubdomainTenancy } from "@/app/lib/middlewareSubdomainTenancy";
import { stampWorkspaceCookieClears } from "@/app/lib/auth/workspaceSessionCookies";

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
  if (pathname === "/api/internal/platform-admin-gate") return true;
  if (pathname === "/api/internal/tenant-slug-resolve") return true;
  if (pathname === "/api/cron/narrate") return true;
  if (pathname === "/api/cron/gtm-briefing-queue") return true;
  if (pathname === "/api/documentation/execute") return true;
  if (pathname === "/api/board/feed") return true;
  if (pathname.startsWith("/api/internal/ironquery/export")) return true;
  if (isStripeWebhookIngressPath(pathname)) return true;
  if (isIronleadsIngressPath(pathname)) return true;
  if (isSalesteamIngressPath(pathname)) return true;
  if (isSuccessTeamIngressPath(pathname)) return true;
  if (isSupportTeamIngressPath(pathname)) return true;
  if (isInfraHealthPath(pathname)) return true;
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
  if (isPublicCloudIngressPath(pathname)) return true;
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

async function assertPartnerProvisionerForOnboarding(
  request: NextRequest,
  user: { id: string; email?: string | null },
  supabaseResponse: NextResponse,
): Promise<NextResponse | null> {
  const secret =
    process.env.IRONFRAME_INTERNAL_GATES_SECRET?.trim() ||
    process.env.IRONFRAME_CRON_SECRET?.trim();
  if (!secret) {
    const denied = NextResponse.redirect(new URL("/unauthorized", request.url));
    return mergeSupabaseCookies(supabaseResponse, denied);
  }

  const gateUrl = new URL("/api/internal/partner-provisioner-gate", request.url);
  gateUrl.searchParams.set("userId", user.id);
  if (user.email?.trim()) gateUrl.searchParams.set("email", user.email.trim());

  try {
    const gateResponse = await fetch(gateUrl.toString(), {
      headers: { "x-ironframe-internal-gates": secret },
      cache: "no-store",
    });
    if (!gateResponse.ok) {
      const denied = NextResponse.redirect(new URL("/unauthorized", request.url));
      return mergeSupabaseCookies(supabaseResponse, denied);
    }
    const payload = (await gateResponse.json()) as { allowed?: boolean };
    if (payload.allowed !== true) {
      const denied = NextResponse.redirect(new URL("/unauthorized", request.url));
      return mergeSupabaseCookies(supabaseResponse, denied);
    }
    return null;
  } catch {
    const denied = NextResponse.redirect(new URL("/unauthorized", request.url));
    return mergeSupabaseCookies(supabaseResponse, denied);
  }
}

function redirectWithSupabaseCookies(
  request: NextRequest,
  supabaseResponse: NextResponse,
  url: URL,
): NextResponse {
  return mergeSupabaseCookies(supabaseResponse, NextResponse.redirect(url));
}

async function finalizeMiddlewareResponse(
  request: NextRequest,
  response: NextResponse,
  authUser: { id: string } | null = null,
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const redirectTarget = response.headers.get("location") ?? "";
  const clearsWorkspaceScope =
    (!authUser && isAuthPublicPath(pathname)) ||
    (!authUser && redirectTarget.includes("/login"));
  if (clearsWorkspaceScope) {
    stampWorkspaceCookieClears(response);
  }
  return applySubdomainTenancy(request, response);
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
  const pathnameRequestHeaders = withPathnameRequestHeaders(request.headers, pathname);
  const isSessionLogoutRoute = pathname.startsWith("/api/auth/session-logout");
  const supabaseResponse = isSessionLogoutRoute
    ? NextResponse.next({ request: { headers: pathnameRequestHeaders } })
    : await updateSession(request, pathnameRequestHeaders);

  const isAuthCallbackRoute = pathname.startsWith("/api/auth/callback");
  const isSessionBootstrapRoute = pathname.startsWith("/api/auth/session-bootstrap");
  const isWorkspaceLaunchRoute = pathname.startsWith("/api/auth/workspace-launch");

  // Workspace activation: never exchange auth codes or session tokens on apex localhost.
  if (isAuthCallbackRoute && request.nextUrl.searchParams.get("code")) {
    const tenantSlug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    const hostSlug = tenantSlugFromHost(request.headers.get("host"));
    if (tenantSlug && hostSlug !== tenantSlug) {
      const corrected = new URL(
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
        buildTenantSubdomainOrigin(tenantSlug),
      );
      return await finalizeMiddlewareResponse(request, redirectWithSupabaseCookies(request, supabaseResponse, corrected));
    }
  }
  if (isSessionBootstrapRoute) {
    const tenantSlug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    const hostSlug = tenantSlugFromHost(request.headers.get("host"));
    if (tenantSlug && hostSlug !== tenantSlug) {
      const corrected = new URL(
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
        buildTenantSubdomainOrigin(tenantSlug),
      );
      return await finalizeMiddlewareResponse(request, redirectWithSupabaseCookies(request, supabaseResponse, corrected));
    }
  }

  const isLoginRoute = pathname === "/login";
  const isIntegrityRoute = pathname === "/integrity" || pathname.startsWith("/integrity/");
  const isForgotPasswordRoute = pathname === "/forgot-password";
  const isUnauthorizedRoute = pathname === "/unauthorized";
  const isResetPasswordRoute = pathname === "/reset-password";
  const isAuthConfirmRoute = pathname === "/auth/confirm" || pathname.startsWith("/auth/confirm/");
  const isAuthPublicRoute =
    isLoginRoute ||
    isForgotPasswordRoute ||
    isUnauthorizedRoute ||
    isResetPasswordRoute ||
    isAuthConfirmRoute ||
    isAuthCallbackRoute ||
    isSessionBootstrapRoute ||
    isWorkspaceLaunchRoute;
  /** IronBoard (:8082) server bridge ? tenant cookie / host header scoped; no browser session required. */
  const isBoardSharedContextRoute = pathname === "/api/board/shared-context";

  /** Legacy nested path — `app/dashboard/page.tsx` shadowed `/dashboard/*` on tenant hosts. */
  if (pathname === "/dashboard/exports" || pathname === "/dashboard/exports.") {
    const fixed = request.nextUrl.clone();
    fixed.pathname = "/exports";
    return NextResponse.redirect(fixed);
  }

  /** Common URL typo — trailing period after `/exports` yields 404 in App Router. */
  if (pathname === "/exports.") {
    const fixed = request.nextUrl.clone();
    fixed.pathname = "/exports";
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
    return await finalizeMiddlewareResponse(request, supabaseResponse);
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
    const loginUrl = browserFacingUrl(
      request,
      "/login",
      `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`,
    );
    return await finalizeMiddlewareResponse(request, redirectWithSupabaseCookies(request, supabaseResponse, loginUrl), user);
  }

  const hostSlugForAuth = tenantSlugFromHost(request.headers.get("host"));

  // Tenant workspace hosts: never render Command Post for guests on `/`.
  if (!user && hostSlugForAuth && pathname === "/") {
    const loginUrl = browserFacingUrl(request, "/login");
    return await finalizeMiddlewareResponse(
      request,
      redirectWithSupabaseCookies(request, supabaseResponse, loginUrl),
      user,
    );
  }

  // RULE B: Authenticated users on /login → intended post-auth path (honors `?next=`).
  // Apex corporate workspace routing uses RBAC on the server — not stale user_metadata.tenant_slug.
  if (user && isLoginRoute) {
    const inviteToken = request.nextUrl.searchParams.get("invite")?.trim();
    if (!inviteToken) {
      const landingPath = resolveAuthNextPathForHost(
        request.headers.get("host"),
        request.nextUrl.searchParams.get("next"),
      );
      const landingUrl = browserFacingUrl(request, landingPath);
      return await finalizeMiddlewareResponse(request, redirectWithSupabaseCookies(request, supabaseResponse, landingUrl), user);
    }
  }

  if (!user && !isAuthPublicRoute) {
    if (
      isPublicCloudIngressPath(pathname) ||
      isPublicRoute(pathname) ||
      isBoardSharedContextRoute
    ) {
      return await finalizeMiddlewareResponse(request, supabaseResponse, user);
    }
    // Cron endpoints are token-gated in their own route handlers.
    // Never redirect them to /login, or Vercel will return HTML fallback instead of JSON/401.
    if (internalTokenGatedApiPath(pathname)) {
      return await finalizeMiddlewareResponse(request, supabaseResponse, user);
    }

    /** Admin JSON APIs: never redirect to /login HTML — client fetch().json() would fail opaquely. */
    if (pathname.startsWith("/api/admin/")) {
      const denied = NextResponse.json({ error: "Authentication required." }, { status: 401 });
      supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
        denied.cookies.set(name, value);
      });
      return await finalizeMiddlewareResponse(request, denied, user);
    }

    /** Shadow plane / simulation secret: allow local API live-fire without a browser session. */
    if (pathname.startsWith("/api/") && middlewareSimulationBypass(request)) {
      return await finalizeMiddlewareResponse(request, supabaseResponse, user);
    }
    /** Server Actions: let RSC handle auth ? redirect HTML breaks `fetchServerAction` (apiClient fetch patch stack). */
    if (isNextServerActionPost(request)) {
      return await finalizeMiddlewareResponse(request, supabaseResponse, user);
    }
    const loginUrl = browserFacingUrl(
      request,
      "/login",
      `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`,
    );
    return await finalizeMiddlewareResponse(request, redirectWithSupabaseCookies(request, supabaseResponse, loginUrl), user);
  }

  if (user && isForgotPasswordRoute) {
    const integrityUrl = browserFacingUrl(request, "/integrity");
    return await finalizeMiddlewareResponse(request, redirectWithSupabaseCookies(request, supabaseResponse, integrityUrl), user);
  }

  if (user && isUnauthorizedRoute) {
    return await finalizeMiddlewareResponse(request, supabaseResponse, user);
  }

  // RULE A0: Partner provisioner gate (GLOBAL_ADMIN or BUSINESS_ADMIN) for client onboarding
  if (user && isAdminOnboardingPath(pathname)) {
    const denied = await assertPartnerProvisionerForOnboarding(request, user, supabaseResponse);
    if (denied) return denied;
  }

  return await finalizeMiddlewareResponse(request, supabaseResponse, user);
}

export const config = {
  // Broad matcher ? tenant isolation, Ironguard, API cron gates, and dashboard auth all depend on this.
  // Do not narrow to only /, /login, /integrity or unauthenticated API/dashboard routes would leak.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|m4a|wav|ogg)$).*)",
  ],
};
