import "server-only";

import type { Prisma } from "@prisma/client";
import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";
import prisma from "@/lib/prisma";

/**
 * Tenant catalog is not RLS-scoped (`tenants.id` is the tenant key). Cron workers
 * list here, then bind each tenant before touching tenant-scoped tables.
 */
export async function listCatalogTenantIds(): Promise<string[]> {
  const rows = await prisma.tenant.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return rows.map((row) => row.id);
}

/**
 * Explicit `x-tenant-id` / query stays single-tenant. Otherwise iterate the catalog.
 * Never silently fall back to a hardcoded seed tenant.
 */
export async function resolveCronTenantIds(explicit?: string | null): Promise<string[]> {
  const id = explicit?.trim();
  if (id) return [id];
  const ids = await listCatalogTenantIds();
  if (ids.length === 0) {
    throw new Error("CRON_TENANT_CATALOG_EMPTY");
  }
  return ids;
}

/** Header / query / env stay explicit. Missing all three iterates the catalog. */
export function readExplicitCronTenantId(
  request: Request,
  extra?: string | null,
): string | null {
  const url = new URL(request.url);
  return (
    request.headers.get("x-tenant-id")?.trim() ||
    url.searchParams.get("tenantId")?.trim() ||
    extra?.trim() ||
    process.env.SHADOW_PLANE_INGEST_TENANT_UUID?.trim() ||
    null
  );
}

export async function recordCronJobArtifact(input: {
  tenantId: string;
  agentName: string;
  payloadJson: unknown;
  metricValue?: bigint | null;
  metricUnit?: string | null;
}): Promise<{ id: string }> {
  return withIronguardTenant(input.tenantId, (tx) =>
    tx.cronJobArtifact.create({
      data: {
        tenantId: input.tenantId,
        agentName: input.agentName,
        payloadJson: input.payloadJson as Prisma.InputJsonValue,
        metricValue: input.metricValue ?? undefined,
        metricUnit: input.metricUnit ?? undefined,
      },
      select: { id: true },
    }),
  );
}
