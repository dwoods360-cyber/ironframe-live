import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { ensureCorporateInviteRoleAssignment } from "@/app/lib/auth/corporateInviteProvisioning";
import { readTenantSlugFromUserMetadata } from "@/app/lib/auth/tenantInviteMetadata";
import {
  resolveAuthNextPathForHost,
  resolvePublicAppUrl,
  resolveTenantAuthRedirectOrigin,
  sanitizePublicOrigin,
} from "@/app/lib/auth/publicAppUrl";
import { lookupTenantBySlug } from "@/app/lib/tenantSlugRegistry";
import { tenantSlugFromHost, tenantUuidFromSlug } from "@/app/lib/tenantSubdomain";

const IRONFRAME_TENANT_COOKIE = "ironframe-tenant";
const TENANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function resolveRequestHost(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim() ||
    ""
  );
}

function resolveRedirectOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost && process.env.NODE_ENV === "production") {
    return sanitizePublicOrigin(`${forwardedProto || "https"}://${forwardedHost}`);
  }
  if (forwardedHost) {
    const proto =
      forwardedProto ||
      (forwardedHost.startsWith("localhost") || forwardedHost.startsWith("127.0.0.1")
        ? "http"
        : "https");
    return sanitizePublicOrigin(`${proto}://${forwardedHost}`);
  }
  return resolvePublicAppUrl() || sanitizePublicOrigin(request.nextUrl.origin);
}

function resolveFinalAuthDestination(
  request: NextRequest,
  inviteTenantSlug: string | null,
  rawNext: string | null,
): { origin: string; nextPath: string } {
  const requestHost = resolveRequestHost(request);
  const hostTenantSlug = tenantSlugFromHost(requestHost);
  let origin = resolveRedirectOrigin(request);
  let nextPath = resolveAuthNextPathForHost(requestHost, rawNext);

  if (inviteTenantSlug && (!hostTenantSlug || hostTenantSlug !== inviteTenantSlug)) {
    origin = resolveTenantAuthRedirectOrigin(inviteTenantSlug);
    nextPath = resolveAuthNextPathForHost(new URL(origin).host, nextPath);
  }

  return { origin, nextPath };
}

/**
 * Supabase Auth PKCE callback — exchanges `code` for session cookies and routes
 * recovery flows to `/reset-password` or corporate invites to tenant Command Post.
 */
export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_auth_code", requestUrl.origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    return NextResponse.redirect(new URL("/login?error=auth_not_configured", requestUrl.origin));
  }

  const provisionalOrigin = resolveRedirectOrigin(request);
  const provisionalNext = resolveAuthNextPathForHost(
    resolveRequestHost(request),
    requestUrl.searchParams.get("next"),
  );
  let response = NextResponse.redirect(new URL(provisionalNext, provisionalOrigin));

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.redirect(new URL(provisionalNext, provisionalOrigin));
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[api/auth/callback] exchangeCodeForSession", error.message);
    return NextResponse.redirect(new URL("/login?error=auth_callback_failed", requestUrl.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const inviteTenantSlug = readTenantSlugFromUserMetadata(user?.user_metadata ?? null);

  if (user?.id && inviteTenantSlug) {
    await ensureCorporateInviteRoleAssignment(user.id, inviteTenantSlug);
  }

  const { hasCurrentLegalConsent } = await import("@/app/lib/legal/consent");
  const { LEGAL_ACCEPT_PATH } = await import("@/config/legal");
  const needsLegalAccept = user?.id && !(await hasCurrentLegalConsent(user.id));

  const { origin, nextPath } = resolveFinalAuthDestination(
    request,
    inviteTenantSlug,
    requestUrl.searchParams.get("next"),
  );

  if (needsLegalAccept) {
    const acceptUrl = new URL(LEGAL_ACCEPT_PATH, origin);
    acceptUrl.searchParams.set("next", nextPath);
    const legalRedirect = NextResponse.redirect(acceptUrl);
    response.cookies.getAll().forEach(({ name, value, ...options }) => {
      legalRedirect.cookies.set(name, value, options);
    });
    return legalRedirect;
  }

  const finalResponse = NextResponse.redirect(new URL(nextPath, origin));
  response.cookies.getAll().forEach(({ name, value, ...options }) => {
    finalResponse.cookies.set(name, value, options);
  });
  response = finalResponse;

  const hostTenantSlug = tenantSlugFromHost(resolveRequestHost(request));
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

  return response;
}
