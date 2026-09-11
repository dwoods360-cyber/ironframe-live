import "server-only";

import { PrismaClient } from "@prisma/client";
import { resolveServerlessDatabaseUrl } from "@/lib/prismaServerless";

declare global {
  var ironframePrivilegedPrisma: PrismaClient | undefined;
}

function databaseRole(rawUrl: string, variableName: string): string {
  try {
    const role = decodeURIComponent(
      new URL(rawUrl.replace(/^postgres:\/\//, "postgresql://")).username,
    ).trim();
    if (!role) throw new Error("missing role");
    return role;
  } catch {
    throw new Error(`${variableName}_INVALID`);
  }
}

export function requirePrivilegedDatabaseUrl(
  privilegedUrl = process.env.PRIVILEGED_DATABASE_URL,
  applicationUrl = process.env.DATABASE_URL,
): string {
  const raw = privilegedUrl?.trim();
  if (!raw) throw new Error("PRIVILEGED_DATABASE_URL_REQUIRED");

  const privilegedRole = databaseRole(raw, "PRIVILEGED_DATABASE_URL");
  const appRaw = applicationUrl?.trim();
  if (appRaw) {
    const applicationRole = databaseRole(appRaw, "DATABASE_URL");
    if (privilegedRole === applicationRole) {
      throw new Error("PRIVILEGED_DATABASE_ROLE_MUST_DIFFER_FROM_APPLICATION_ROLE");
    }
  }

  return resolveServerlessDatabaseUrl(raw) ?? raw;
}

/**
 * Deliberately separate client for audited cross-tenant platform operations.
 * Construction is lazy so ordinary tenant request paths never require or open
 * the privileged connection. Missing or shared-role configuration fails closed.
 */
export function getPrismaPrivileged(): PrismaClient {
  if (globalThis.ironframePrivilegedPrisma) return globalThis.ironframePrivilegedPrisma;

  const client = new PrismaClient({
    datasources: {
      db: { url: requirePrivilegedDatabaseUrl() },
    },
  });
  globalThis.ironframePrivilegedPrisma = client;
  return client;
}
