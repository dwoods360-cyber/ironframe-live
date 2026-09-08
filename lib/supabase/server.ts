import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { envPublicSupabaseUrl, envSupabaseAnonKey } from '@/lib/supabase/envPublic';

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = envPublicSupabaseUrl() || 'https://build-bypass.supabase.co';
  const supabaseKey = envSupabaseAnonKey() || 'build-bypass-key';

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored if called from Server Component
          }
        },
      },
    }
  );
}
