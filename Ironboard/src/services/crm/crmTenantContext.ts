import type { Prisma } from '@prisma/client';
import { getPrisma } from '../prisma.js';

const TENANT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function requireTenantId(raw: unknown): string {
  const tenantId = String(raw ?? '').trim();
  if (!tenantId) throw new Error('tenantId is required for tenant-isolated CRM access');
  if (!TENANT_UUID_RE.test(tenantId)) {
    throw new Error('tenantId must be a workspace tenant UUID');
  }
  return tenantId;
}

/** Bind Ironguard session GUC — must be first statement in the CRM transaction. */
export async function bindIronguardTenant(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<void> {
  try {
    await tx.$executeRaw`SELECT ironguard_set_session_tenant(${tenantId}::uuid);`;
  } catch {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true);`;
  }
}

export async function runIronboardCrmTransaction<T>(
  tenantIdRaw: unknown,
  run: (tx: Prisma.TransactionClient, tenantId: string) => Promise<T>,
): Promise<T> {
  const tenantId = requireTenantId(tenantIdRaw);
  const prisma = getPrisma();
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await bindIronguardTenant(tx, tenantId);
    return run(tx, tenantId);
  });
}
