import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { envPublicSupabaseUrl, envSupabaseAnonKey } from "@/lib/supabase/envPublic";

export const IRONFRAME_PATHNAME_HEADER = "x-pathname";

export function withPathnameRequestHeaders(
  source: Headers,
  pathname: string,
): Headers {
  const headers = new Headers(source);
  headers.set(IRONFRAME_PATHNAME_HEADER, pathname);
  return headers;
}

/**
 * Refresh the Supabase session and return the `NextResponse` that carries `Set-Cookie`.
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(
  request: NextRequest,
  requestHeaders?: Headers,
): Promise<NextResponse> {
  const nextInit = requestHeaders ? { request: { headers: requestHeaders } } : undefined;
  const supabaseUrl = envPublicSupabaseUrl();
  const supabaseKey = envSupabaseAnonKey();
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next(nextInit);
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

  await supabase.auth.getUser();

  return supabaseResponse;
}
