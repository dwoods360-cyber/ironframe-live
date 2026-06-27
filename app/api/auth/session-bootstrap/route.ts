import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { ensureCorporateInviteRoleAssignment } from "@/app/lib/auth/corporateInviteProvisioning";
import { readTenantSlugFromUserMetadata } from "@/app/lib/auth/tenantInviteMetadata";
import { sanitizeAuthNextPath } from "@/app/lib/auth/publicAppUrl";
import { lookupTenantBySlug } from "@/app/lib/tenantSlugRegistry";
import { tenantSlugFromHost, tenantUuidFromSlug } from "@/app/lib/tenantSubdomain";

const IRONFRAME_TENANT_COOKIE = "ironframe-tenant";
const SIMULATION_MODE_COOKIE = "ironframe-simulation-mode";
const TENANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function resolvePostActivationDestination(request: NextRequest, nextPath: string): URL {
  const url = new URL(nextPath, request.nextUrl.origin);
  if (nextPath === "/get-started" || nextPath.startsWith("/get-started/")) {
    url.searchParams.set("activation", "1");
  }
  return url;
}

function stampProductionPlaneCookies(response: NextResponse): void {
  response.cookies.set(SIMULATION_MODE_COOKIE, "0", {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/**
 * Establishes Supabase session cookies on the tenant workspace host immediately after
 * assisted registration — avoids cross-origin password sign-in and Supabase /verify GET quirks.
 */
function buildLoginFailureUrl(request: NextRequest, errorCode: string): URL {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("error", errorCode);
  loginUrl.searchParams.set("fresh", "1");
  loginUrl.searchParams.set("next", "/get-started");
  return loginUrl;
}

export async function GET(request: NextRequest) {
  const accessToken = request.nextUrl.searchParams.get("access_token")?.trim();
  const refreshToken = request.nextUrl.searchParams.get("refresh_token")?.trim();
  const nextPath = sanitizeAuthNextPath(request.nextUrl.searchParams.get("next"), "/get-started");
  const destination = resolvePostActivationDestination(request, nextPath);

  if (!accessToken || !refreshToken) {
    return NextResponse.redirect(buildLoginFailureUrl(request, "missing_session_tokens"));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    return NextResponse.redirect(buildLoginFailureUrl(request, "auth_not_configured"));
  }

  let response = NextResponse.redirect(destination);

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.redirect(destination);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        stampProductionPlaneCookies(response);
      },
    },
  });

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    console.error("[api/auth/session-bootstrap] setSession", error.message);
    return NextResponse.redirect(buildLoginFailureUrl(request, "session_bootstrap_failed"));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const inviteTenantSlug = readTenantSlugFromUserMetadata(user?.user_metadata ?? null);
  if (user?.id && inviteTenantSlug) {
    await ensureCorporateInviteRoleAssignment(user.id, inviteTenantSlug);
  }

  const hostTenantSlug = tenantSlugFromHost(
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      request.headers.get("host")?.trim() ||
      "",
  );
  const cookieSlug = inviteTenantSlug ?? hostTenantSlug;
  let cookieUuid: string | null = null;
  if (cookieSlug) {
    cookieUuid = tenantUuidFromSlug(cookieSlug);
    if (!cookieUuid) {
      const tenant = await lookupTenantBySlug(cookieSlug);
      cookieUuid = tenant?.id ?? null;
    }
  }

  if (cookieUuid) {
    response.cookies.set(IRONFRAME_TENANT_COOKIE, cookieUuid, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: TENANT_COOKIE_MAX_AGE,
    });
  }

  stampProductionPlaneCookies(response);

  return response;
}
