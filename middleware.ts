import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "@/lib/supabase/middleware";
import { assertTenantAccess } from "@/app/utils/tenantIsolation";
import { isShadowPlaneActiveFromEnv } from "@/app/utils/shadowPlaneActive";

/**
 * Global: Supabase session refresh (`updateSession` on all matched routes).
 * API routes: same tenant cross-check as legacy `proxy.ts` (x-tenant-id / x-target-tenant-id / tenantUuid).
 */
export async function middleware(request: NextRequest) {
  const supabaseResponse = await updateSession(request);
  const pathname = request.nextUrl.pathname;
  const isLoginRoute = pathname === "/login";

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
    const shadowPlaneActive =
      isShadowPlaneActiveFromEnv() ||
      request.cookies.get("ironframe-simulation-mode")?.value === "1";
    const simulationBypass =
      Boolean(simSecret && isLocalHost && (headerSecret === simSecret || bearer === simSecret)) ||
      shadowPlaneActive;

    if (
      !simulationBypass &&
      targetTenantUuid &&
      !assertTenantAccess(activeTenantUuid, targetTenantUuid)
    ) {
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

  if (!user && !isLoginRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLoginRoute) {
    const integrityUrl = request.nextUrl.clone();
    integrityUrl.pathname = "/integrity";
    integrityUrl.search = "";
    return NextResponse.redirect(integrityUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
