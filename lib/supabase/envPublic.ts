/** Shared NEXT_PUBLIC Supabase env normalization (browser + middleware). */
export function envPublicSupabaseUrl(): string {
  let s = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim().replace(/\/+$/, "");
  }
  return s;
}

export function envSupabaseAnonKey(): string {
  let s = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export function supabaseProjectRefFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}
