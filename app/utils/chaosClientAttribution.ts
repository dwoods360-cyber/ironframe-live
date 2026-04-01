import { createClient } from "@/lib/supabase/client";

/** Serializable payload for server actions (chaos inject / JIT grant). */
export type ChaosClientAttribution = {
  userId: string;
  displayName: string;
};

const OPERATOR_COOKIE = "ironframe-operator-id";

function readOperatorIdFromDocumentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${OPERATOR_COOKIE}=([^;]*)`));
  const raw = m?.[1]?.trim();
  if (!raw) return null;
  try {
    const v = decodeURIComponent(raw);
    return v.length > 0 ? v : null;
  } catch {
    return raw.length > 0 ? raw : null;
  }
}

function attributionFromSupabaseUser(user: {
  id?: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): ChaosClientAttribution | null {
  const id = typeof user.id === "string" ? user.id.trim() : "";
  const email = user.email?.trim() ?? "";
  const metaName = user.user_metadata?.full_name;
  const displayFromMeta = typeof metaName === "string" ? metaName.trim() : "";

  if (id.length > 0) {
    const displayName = displayFromMeta || email || id;
    return { userId: id, displayName };
  }
  if (email.length > 0) {
    return { userId: email, displayName: displayFromMeta || email };
  }
  return null;
}

/**
 * Read operator identity in the browser for Integrity Hub "Authorized by".
 * Order: Supabase `getUser()` → `getSession()` → `ironframe-operator-id` cookie.
 */
export async function fetchChaosLedgerClientAttribution(): Promise<ChaosClientAttribution | null> {
  const supabase = createClient();

  const {
    data: { user: userFromGet },
  } = await supabase.auth.getUser();
  const fromGet = userFromGet ? attributionFromSupabaseUser(userFromGet) : null;
  if (fromGet) return fromGet;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const u = session?.user;
  if (u) {
    const fromSession = attributionFromSupabaseUser(u);
    if (fromSession) return fromSession;
  }

  const fromCookie = readOperatorIdFromDocumentCookie();
  if (fromCookie) {
    return { userId: fromCookie, displayName: fromCookie };
  }

  return null;
}
