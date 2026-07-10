import "server-only";

export function isServerlessRuntime(): boolean {
  return process.env.VERCEL === "1" || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/**
 * Supabase transaction pooler + Vercel: Prisma defaults to connection_limit=1.
 * Extend pool/connect timeouts and ensure pgbouncer mode on port 6543.
 */
export function resolveServerlessDatabaseUrl(rawUrl?: string): string | undefined {
  const raw = rawUrl?.trim();
  if (!raw || !isServerlessRuntime()) return raw;

  try {
    const normalized = raw.replace(/^postgres:\/\//, "postgresql://");
    const url = new URL(normalized);
    if (url.port === "6543" && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "30");
    }
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "30");
    }
    return url.toString();
  } catch {
    return raw;
  }
}
