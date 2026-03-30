import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const UNAUTH_DMZ =
  "Unauthorized: DMZ disposition requires an authenticated operator. Sign in with Supabase, set cookie ironframe-operator-id, or set DMZ_DISPOSITION_OPERATOR_ID.";

const OPERATOR_COOKIE = "ironframe-operator-id";

/**
 * Resolve Supabase user id using the **anon** key + request cookies.
 * Service-role server clients do not reliably resolve `auth.getUser()` from the browser session.
 */
async function createSupabaseServerClientFromCookies() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) return null;

  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, anonKey, {
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
}

async function trySupabaseUserIdFromSessionCookies(): Promise<string | undefined> {
  const supabase = await createSupabaseServerClientFromCookies();
  if (!supabase) return undefined;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || user == null) return undefined;
  const id = typeof user.id === "string" ? user.id.trim() : "";
  return id.length > 0 ? id : undefined;
}

/** Full Supabase user from dashboard cookies (anon client). */
export async function getSupabaseSessionUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClientFromCookies();
  if (!supabase) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || user == null) return null;
  return user;
}

function remoteAccessAdminEmailAllowlist(): string[] {
  return (process.env.IRONFRAME_REMOTE_ACCESS_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Admin/Owner (metadata) or email allowlist — used for remote access authorization only. */
export function userEligibleForRemoteAccessToggle(user: User): boolean {
  const metaRole = user.app_metadata?.role ?? user.user_metadata?.role;
  if (typeof metaRole === "string" && /^(admin|owner)$/i.test(metaRole.trim())) {
    return true;
  }
  const email = user.email?.trim().toLowerCase();
  if (email && remoteAccessAdminEmailAllowlist().includes(email)) {
    return true;
  }
  return false;
}

export async function isRemoteAccessAdminEligible(): Promise<boolean> {
  const user = await getSupabaseSessionUser();
  return user != null && userEligibleForRemoteAccessToggle(user);
}

export async function requireSupabaseAdminOrOwnerForRemoteAccess(): Promise<string> {
  const user = await getSupabaseSessionUser();
  if (!user) {
    throw new Error("Sign in with Supabase to authorize remote access.");
  }
  if (!userEligibleForRemoteAccessToggle(user)) {
    throw new Error(
      "Only Admin or Owner (or IRONFRAME_REMOTE_ACCESS_ADMIN_EMAILS allowlist) can authorize remote access.",
    );
  }
  const id = typeof user.id === "string" ? user.id.trim() : "";
  if (!id) {
    throw new Error("Invalid session.");
  }
  return id;
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
