import "server-only";

import type { Prisma } from "@prisma/client";
import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";
import { resolveProspectPoolTenantId } from "@/app/lib/server/salesAgentConsoleCore";

/**
 * Ironleads / Path B operator CRM lives on the prospect-pool tenant.
 * Bind that tenant before any `ironboard_crm_*` read or write.
 */
export async function withProspectPoolTenant<T>(
  run: (tx: Prisma.TransactionClient, tenantId: string) => Promise<T>,
): Promise<T> {
  const tenantId = resolveProspectPoolTenantId();
  return withIronguardTenant(tenantId, (tx) => run(tx, tenantId));
}
