import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Privileged storage-only client for immutable evidence uploads.
 *
 * This credential is intentionally distinct from the browser/session client and the general
 * platform-admin client. Import this module only from the WORM storage boundary.
 */
export function createSupabaseWormStorageClient() {
  const supabaseUrl =
    process.env.SUPABASE_WORM_STORAGE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const storageKey = process.env.SUPABASE_WORM_STORAGE_SECRET_KEY?.trim();

  if (!supabaseUrl || !storageKey) {
    throw new Error(
      "SUPABASE_WORM_STORAGE_SECRET_KEY and Supabase URL are required for immutable evidence uploads.",
    );
  }

  return createClient(supabaseUrl, storageKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
