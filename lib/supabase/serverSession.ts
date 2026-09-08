import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { envPublicSupabaseUrl, envSupabaseAnonKey } from "@/lib/supabase/envPublic";

/**
 * Supabase client bound to the operator browser session (anon key + auth cookies).
 * Use for sign-in, password reset, and session-scoped auth mutations — never service role.
 */
export async function createServerSessionClient() {
  const supabaseUrl = envPublicSupabaseUrl();
  const anonKey = envSupabaseAnonKey();
  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase public credentials are not configured.");
  }

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
          /* Server Component read-only cookie scope */
        }
      },
    },
  });
}
