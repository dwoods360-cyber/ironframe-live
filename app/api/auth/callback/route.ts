import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { readTenantSlugFromUserMetadata } from "@/app/lib/auth/tenantInviteMetadata";
import { resolvePublicAppUrl, sanitizeAuthNextPath } from "@/app/lib/auth/publicAppUrl";

const IRONFRAME_TENANT_COOKIE = "ironframe-tenant";
const TENANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function resolveRedirectOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.trim() || "https";
  if (forwardedHost && process.env.NODE_ENV === "production") {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, "");
  }
  return resolvePublicAppUrl() || request.nextUrl.origin;
}

/**
 * Supabase Auth PKCE callback — exchanges `code` for session cookies and routes
 * recovery flows to `/reset-password` or corporate invites to `/integrity`.
 */
export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get("code");
  const nextPath = sanitizeAuthNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_auth_code", requestUrl.origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    return NextResponse.redirect(new URL("/login?error=auth_not_configured", requestUrl.origin));
  }

  const origin = resolveRedirectOrigin(request);
  let response = NextResponse.redirect(new URL(nextPath, origin));

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.redirect(new URL(nextPath, origin));
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

  const tenantSlug = readTenantSlugFromUserMetadata(user?.user_metadata ?? null);
  if (tenantSlug) {
    response.cookies.set(IRONFRAME_TENANT_COOKIE, tenantSlug, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: TENANT_COOKIE_MAX_AGE,
    });
  }

  return response;
}
