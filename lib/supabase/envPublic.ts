/** Shared NEXT_PUBLIC Supabase env normalization (browser + middleware). */
export function envPublicSupabaseUrl(): string {
  let s = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim().replace(/\/+$/, "");
  }
  return s;
}

function legacyJwtRole(value: string): string | null {
  const segments = value.split(".");
  if (segments.length !== 3) return null;
  try {
    const normalized = segments[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(globalThis.atob(padded)) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export function assertBrowserSafeSupabaseKey(value: string, variableName: string): string {
  const role = legacyJwtRole(value);
  if (/^sb_secret_/i.test(value) || role === "service_role") {
    throw new Error(
      `${variableName} must contain a Supabase publishable/anon key, never a secret/service_role key.`,
    );
  }
  if (/^sb_publishable_/i.test(value) || role === "anon") return value;
  throw new Error(
    `${variableName} is not a recognized Supabase browser key. Use an sb_publishable_ key or legacy anon JWT.`,
  );
}

export function envSupabaseAnonKey(): string {
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const variableName = publishable != null
    ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    : "NEXT_PUBLIC_SUPABASE_ANON_KEY";
  let s = (publishable ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s ? assertBrowserSafeSupabaseKey(s, variableName) : s;
}

export function supabaseProjectRefFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}
