import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { IRONFRAME_TENANT_COOKIE } from "@/app/lib/auth/dashboardTenantSession";

export const SESSION_LOGOUT_PATH = "/api/auth/session-logout";

const WORKSPACE_SCOPE_COOKIES = [IRONFRAME_TENANT_COOKIE, "ironframe-simulation-mode"] as const;

function workspaceCookieClearOptions(): {
  path: string;
  sameSite: "lax";
  secure: boolean;
  maxAge: number;
} {
  return {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  };
}

export function resolveSessionLogoutNextPath(request: NextRequest): string {
  const raw = request.nextUrl.searchParams.get("next")?.trim();
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/login";
  }
  return raw;
}

function stampWorkspaceCookieClears(response: NextResponse): void {
  const options = workspaceCookieClearOptions();
  for (const name of WORKSPACE_SCOPE_COOKIES) {
    response.cookies.set(name, "", options);
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
      ? NextResponse.redirect(redirectTarget)
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
              ? NextResponse.redirect(redirectTarget)
              : NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
          stampWorkspaceCookieClears(response);
        },
      },
    });

    await supabase.auth.signOut();
  }

  stampWorkspaceCookieClears(response);
  return response;
}
