import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { envPublicSupabaseUrl, envSupabaseAnonKey } from "@/lib/supabase/envPublic";

export const IRONFRAME_PATHNAME_HEADER = "x-pathname";

export type MiddlewareSessionResult = {
  response: NextResponse;
  user: User | null;
  /** True when a dead refresh token was detected and auth cookies were cleared. */
  clearedInvalidRefreshToken: boolean;
};

export function withPathnameRequestHeaders(
  source: Headers,
  pathname: string,
): Headers {
  const headers = new Headers(source);
  headers.set(IRONFRAME_PATHNAME_HEADER, pathname);
  return headers;
}

export function isInvalidRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message =
    "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return (
    code === "refresh_token_not_found" ||
    /invalid refresh token/i.test(message) ||
    /refresh token not found/i.test(message)
  );
}

/** Drop Supabase auth cookies so a dead refresh token cannot poison every navigation. */
function clearSupabaseAuthCookies(response: NextResponse, request: NextRequest): void {
  for (const { name } of request.cookies.getAll()) {
    if (name.startsWith("sb-") || name.includes("auth-token")) {
      response.cookies.set(name, "", { path: "/", maxAge: 0 });
      request.cookies.set(name, "");
    }
  }
}

/**
 * Refresh the Supabase session once per middleware pass and return the `NextResponse`
 * that carries `Set-Cookie`, plus the resolved user (or null after a dead refresh token).
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(
  request: NextRequest,
  requestHeaders?: Headers,
): Promise<MiddlewareSessionResult> {
  const nextInit = requestHeaders ? { request: { headers: requestHeaders } } : undefined;
  const supabaseUrl = envPublicSupabaseUrl();
  const supabaseKey = envSupabaseAnonKey();
  if (!supabaseUrl || !supabaseKey) {
    return {
      response: NextResponse.next(nextInit),
      user: null,
      clearedInvalidRefreshToken: false,
    };
  }

  let supabaseResponse = NextResponse.next(nextInit);

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next(nextInit);
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error && isInvalidRefreshTokenError(error)) {
      clearSupabaseAuthCookies(supabaseResponse, request);
      // One soft line — avoid repeating AuthApiError on every subsequent getUser in this pass.
      console.info(
        "[ironframe] cleared invalid Supabase refresh token cookies; continuing as signed out",
      );
      return {
        response: supabaseResponse,
        user: null,
        clearedInvalidRefreshToken: true,
      };
    }
    if (error) {
      // Non-refresh auth errors: keep navigation alive; do not treat as a hard shell failure.
      console.info("[ironframe] updateSession getUser soft-fail:", error.message ?? error);
      return {
        response: supabaseResponse,
        user: null,
        clearedInvalidRefreshToken: false,
      };
    }
    return {
      response: supabaseResponse,
      user: data.user ?? null,
      clearedInvalidRefreshToken: false,
    };
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      clearSupabaseAuthCookies(supabaseResponse, request);
      console.info(
        "[ironframe] cleared invalid Supabase refresh token cookies; continuing as signed out",
      );
      return {
        response: supabaseResponse,
        user: null,
        clearedInvalidRefreshToken: true,
      };
    }
    // Keep navigation alive — a dead session must not hard-fail the shell.
    console.info("[ironframe] updateSession getUser failed:", error);
    return {
      response: supabaseResponse,
      user: null,
      clearedInvalidRefreshToken: false,
    };
  }
}
