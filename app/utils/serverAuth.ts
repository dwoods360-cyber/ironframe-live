import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const UNAUTH_DMZ =
  "Unauthorized: DMZ disposition requires an authenticated operator. Sign in with Supabase, set cookie ironframe-operator-id, or set DMZ_DISPOSITION_OPERATOR_ID.";

const OPERATOR_COOKIE = "ironframe-operator-id";

/**
 * Resolve Supabase user id using the **anon** key + request cookies.
 * Service-role server clients do not reliably resolve `auth.getUser()` from the browser session.
 */
async function trySupabaseUserIdFromSessionCookies(): Promise<string | undefined> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) return undefined;

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* Server Component / read-only cookie scope */
        }
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || user == null) return undefined;
  const id = typeof user.id === "string" ? user.id.trim() : "";
  return id.length > 0 ? id : undefined;
}

/**
 * Operator id for DMZ / clearance mutations (audit + work notes).
 * Order: Supabase session (anon client) → ironframe-operator-id cookie → DMZ_DISPOSITION_OPERATOR_ID env.
 */
export async function resolveDispositionOperatorId(): Promise<string> {
  const fromSupabase = await trySupabaseUserIdFromSessionCookies();
  if (fromSupabase) return fromSupabase;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(OPERATOR_COOKIE)?.value?.trim();
  if (fromCookie && fromCookie.length > 0) return fromCookie;

  const fromEnv = process.env.DMZ_DISPOSITION_OPERATOR_ID?.trim();
  if (fromEnv && fromEnv.length > 0) return fromEnv;

  throw new Error(UNAUTH_DMZ);
}

/** @deprecated Use resolveDispositionOperatorId — same behavior, clearer name for DMZ. */
export async function requireAuthenticatedOperatorId(): Promise<string> {
  return resolveDispositionOperatorId();
}
