import "server-only";

import { isServerlessRuntime, resolveServerlessDatabaseUrl } from "@/lib/prismaServerless";

const ACADEMIC_SCHEMA = "academic_fellows";

export type FellowsDbIdentity = {
  user: string;
  host: string;
  port: string;
  database: string;
  schema: string | null;
};

/** Parse connection identity without logging credentials. */
export function parseFellowsDbIdentity(rawUrl: string): FellowsDbIdentity | null {
  try {
    const normalized = rawUrl.trim().replace(/^postgres:\/\//, "postgresql://");
    const url = new URL(normalized);
    const schema =
      url.searchParams.get("schema")?.trim().toLowerCase() ||
      extractSearchPathSchema(url.searchParams.get("options")) ||
      null;
    return {
      user: decodeURIComponent(url.username || ""),
      host: url.hostname.toLowerCase(),
      port: url.port || "5432",
      database: decodeURIComponent((url.pathname || "/").replace(/^\//, "") || "postgres"),
      schema,
    };
  } catch {
    return null;
  }
}

function extractSearchPathSchema(options: string | null): string | null {
  if (!options) return null;
  const decoded = decodeURIComponent(options);
  const match = decoded.match(/search_path\s*=\s*([a-zA-Z0-9_]+)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

/**
 * Fellows DB must not silently share the Path B public surface.
 * Allowed: distinct DB user, distinct database name, or explicit academic_fellows schema.
 */
export function assertFellowsDatabaseIsolated(
  fellowsUrl: string,
  primaryUrl: string | undefined,
): void {
  const fellows = parseFellowsDbIdentity(fellowsUrl);
  if (!fellows) {
    throw new Error("FELLOWS_DATABASE_URL is not a valid Postgres URL");
  }

  const schemaOk = fellows.schema === ACADEMIC_SCHEMA;
  if (!primaryUrl?.trim()) {
    if (!schemaOk) {
      throw new Error(
        `FELLOWS_DATABASE_URL must include schema=${ACADEMIC_SCHEMA} (or a dedicated fellows database/role)`,
      );
    }
    return;
  }

  const primary = parseFellowsDbIdentity(primaryUrl);
  if (!primary) return;

  const sameHostDb =
    fellows.host === primary.host &&
    fellows.port === primary.port &&
    fellows.database === primary.database;
  const sameUser = fellows.user === primary.user && fellows.user.length > 0;

  if (sameHostDb && sameUser && !schemaOk) {
    throw new Error(
      "FELLOWS_DATABASE_URL matches primary DATABASE_URL without academic_fellows isolation. " +
        `Use schema=${ACADEMIC_SCHEMA} and preferably role ironframe_fellows_app ` +
        "(see prisma/fellows/ops/01_create_role_and_grants.sql).",
    );
  }
}

export function resolveFellowsDatabaseUrl(): string {
  const useBuildPlaceholder =
    process.env.GITHUB_ACTIONS === "true" || process.env.NEXT_BUILD_PHASE === "true";

  const raw = process.env.FELLOWS_DATABASE_URL?.trim();
  if (!raw) {
    if (useBuildPlaceholder) {
      return "postgresql://postgres:postgres_password@127.0.0.1:5432/ironframe_fellows_test?schema=academic_fellows";
    }
    throw new Error(
      "FELLOWS_DATABASE_URL is required — Academic Fellowship must not use the primary Path B DATABASE_URL",
    );
  }

  assertFellowsDatabaseIsolated(raw, process.env.DATABASE_URL);
  return resolveServerlessDatabaseUrl(raw) ?? raw;
}

export { ACADEMIC_SCHEMA as FELLOWS_ACADEMIC_SCHEMA };
