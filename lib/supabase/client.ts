import { createBrowserClient } from "@supabase/ssr";
import { envPublicSupabaseUrl, envSupabaseAnonKey } from "@/lib/supabase/envPublic";

const supabaseUrl = envPublicSupabaseUrl() || "https://build-bypass.supabase.co";
const supabaseKey = envSupabaseAnonKey() || "build-bypass-key";

export const createClient = () => createBrowserClient(supabaseUrl, supabaseKey);
