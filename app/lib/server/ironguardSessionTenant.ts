import "server-only";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

const TENANT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type IronguardTransactionOptions = {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
};

function requireTenantUuid(tenantId: string): string {
  const id = tenantId.trim();
  if (!TENANT_UUID_RE.test(id)) {
    throw new Error("IRONGUARD_SESSION_TENANT_UUID_REQUIRED");
  }
  return id;
}

/**
 * Bind the Ironguard RLS tenant for the current transaction.
 *
 * `ironguard_set_session_tenant` is absent on databases that have not had the
 * session-GUC migration applied, so its presence is probed with `to_regprocedure`,
 * which returns NULL instead of raising. Calling it directly and catching the
 * failure cannot work: a failed statement aborts the surrounding Postgres
 * transaction, so the fallback would itself fail with 25P02.
 */
export async function bindIronguardTenant(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<void> {
  const id = requireTenantUuid(tenantId);
  const rows = await tx.$queryRaw<Array<{ present: boolean }>>`
    SELECT to_regprocedure('public.ironguard_set_session_tenant(uuid)') IS NOT NULL AS present
  `;
  if (rows[0]?.present) {
    await tx.$executeRaw`SELECT public.ironguard_set_session_tenant(${id}::uuid);`;
    return;
  }
  await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${id}, true);`;
}

/**
 * Run tenant-scoped work on one connection with a transaction-local RLS tenant.
 * Explicit Prisma `where` predicates remain required as defense in depth.
 */
export async function withIronguardTenant<T>(
  tenantId: string,
  run: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: IronguardTransactionOptions,
): Promise<T> {
  const id = requireTenantUuid(tenantId);
  return prisma.$transaction(async (tx) => {
    await bindIronguardTenant(tx, id);
    return run(tx);
  }, options);
}
