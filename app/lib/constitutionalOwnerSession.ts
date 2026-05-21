import "server-only";

import type { User } from "@supabase/supabase-js";
import { SYSTEM_OWNER_ID } from "@/app/config/constitutionalAuthority";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";

export function sessionUserIsSystemOwner(user: User | null | undefined): boolean {
  if (!user) return false;
  const owner = SYSTEM_OWNER_ID;
  const uid = (user.id ?? "").trim();
  const email = (user.email ?? "").trim();
  return (
    uid === owner ||
    email === owner ||
    uid.toLowerCase() === owner.toLowerCase() ||
    email.toLowerCase() === owner.toLowerCase()
  );
}

/** Requires authenticated session matching {@link SYSTEM_OWNER_ID}. */
export async function requireSystemOwnerSession(): Promise<User> {
  const user = await getSupabaseSessionUser();
  if (!user) {
    throw new Error("Authentication required. SYSTEM_OWNER_ID session not present.");
  }
  if (!sessionUserIsSystemOwner(user)) {
    throw new Error("Only SYSTEM_OWNER_ID may authorize constitutional override.");
  }
  return user;
}
