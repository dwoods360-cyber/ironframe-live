import { createClient } from "@/lib/supabase/client";

/**
 * Browser Supabase client for Realtime subscriptions on the dashboard (alias per ops mandate).
 */
export const supabaseBrowser = createClient;
