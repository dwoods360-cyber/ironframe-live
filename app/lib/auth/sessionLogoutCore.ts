import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  stampWorkspaceCookieClears,
  WORKSPACE_SCOPE_COOKIE_NAMES,
} from "@/app/lib/auth/workspaceSessionCookies";

export const SESSION_LOGOUT_PATH = "/api/auth/session-logout";

export function resolveSessionLogoutNextPath(request: NextRequest): string {
  const raw = request.nextUrl.searchParams.get("next")?.trim();
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/login";
  }
  return raw;
}

function clearSupabaseAuthCookiesFromRequest(request: NextRequest, response: NextResponse): void {
  const options = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    expires: new Date(0),
  };
  for (const { name } of request.cookies.getAll()) {
    if (name.startsWith("sb-") || WORKSPACE_SCOPE_COOKIE_NAMES.includes(name as (typeof WORKSPACE_SCOPE_COOKIE_NAMES)[number])) {
      response.cookies.set(name, "", options);
      response.cookies.delete(name);
    }
  }
}

/** Terminates Supabase session and clears workspace scope cookies on the active host. */
export async function buildSessionLogoutResponse(
  request: NextRequest,
  mode: "redirect" | "json",
): Promise<NextResponse> {
  const nextPath = resolveSessionLogoutNextPath(request);
  const redirectTarget = new URL(nextPath, request.url);

  let response =
    mode === "redirect"
      ? NextResponse.redirect(redirectTarget, 303)
      : NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (supabaseUrl && anonKey) {
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response =
            mode === "redirect"
              ? NextResponse.redirect(redirectTarget, 303)
              : NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
          stampWorkspaceCookieClears(response);
          clearSupabaseAuthCookiesFromRequest(request, response);
        },
      },
    });

    await supabase.auth.signOut();
  }

  stampWorkspaceCookieClears(response);
  clearSupabaseAuthCookiesFromRequest(request, response);
  return response;
}
