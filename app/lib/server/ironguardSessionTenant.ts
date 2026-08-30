import type { Prisma } from "@prisma/client";

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
  const rows = await tx.$queryRaw<Array<{ present: boolean }>>`
    SELECT to_regprocedure('public.ironguard_set_session_tenant(uuid)') IS NOT NULL AS present
  `;
  if (rows[0]?.present) {
    await tx.$executeRaw`SELECT public.ironguard_set_session_tenant(${tenantId}::uuid);`;
    return;
  }
  await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true);`;
}
