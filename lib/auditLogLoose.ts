import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { getPrismaPrivileged } from "@/lib/prismaPrivileged";

type AuditLogCreateArgs = Parameters<typeof prisma.auditLog.create>[0];
type LooseAuditCreateArgs = Omit<AuditLogCreateArgs, "data"> & { data: Record<string, unknown> };

const TENANT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asTenantUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return TENANT_UUID_RE.test(id) ? id : null;
}

async function lookupTenantFromThreatRefs(data: Record<string, unknown>): Promise<string | null> {
  const threatId = typeof data.threatId === "string" ? data.threatId.trim() : "";
  const simThreatId = typeof data.simThreatId === "string" ? data.simThreatId.trim() : "";
  if (!threatId && !simThreatId) return null;

  const readers: Array<{
    riskEvent: { findFirst: typeof prisma.riskEvent.findFirst };
    threatEvent: { findFirst: typeof prisma.threatEvent.findFirst };
  }> = [];

  try {
    readers.push(getPrismaPrivileged());
  } catch {
    /* PRIVILEGED_DATABASE_URL may be unset while still on BYPASSRLS. */
  }
  readers.push(prisma);

  for (const client of readers) {
    if (simThreatId) {
      const row = await client.riskEvent.findFirst({
        where: { id: simThreatId },
        select: { tenantId: true },
      });
      const tenantId = asTenantUuid(row?.tenantId);
      if (tenantId) return tenantId;
    }
    if (threatId) {
      const row = await client.threatEvent.findFirst({
        where: { id: threatId },
        select: { tenantId: true },
      });
      const tenantId = asTenantUuid(row?.tenantId);
      if (tenantId) return tenantId;
    }
  }
  return null;
}

async function resolveLooseAuditTenantId(data: Record<string, unknown>): Promise<string> {
  const direct =
    asTenantUuid(data.tenantId) ||
    asTenantUuid(data.tenant_id) ||
    asTenantUuid(data.governance_tenant_uuid);
  if (direct) return direct;

  try {
    const cookie = await getActiveTenantUuidFromCookies();
    const fromCookie = asTenantUuid(cookie);
    if (fromCookie) return fromCookie;
  } catch {
    /* non-request contexts */
  }

  const fromThreat = await lookupTenantFromThreatRefs(data);
  if (fromThreat) return fromThreat;

  throw new Error("IRONGUARD_SESSION_TENANT_UUID_REQUIRED");
}

/**
 * Creates an AuditLog row inside a tenant-bound Ironguard transaction.
 * Resolves tenant from `tenantId` / `governance_tenant_uuid` / cookie / threat refs.
 * Call sites already inside `withIronguardTenant` should prefer {@link auditLogCreateLooseTx}.
 */
export async function auditLogCreateLoose(args: LooseAuditCreateArgs) {
  const data = { ...args.data };
  const tenantId = await resolveLooseAuditTenantId(data);
  data.tenantId = tenantId;
  if (!asTenantUuid(data.governance_tenant_uuid)) {
    data.governance_tenant_uuid = tenantId;
  }
  delete data.tenant_id;

  return withIronguardTenant(tenantId, (tx) =>
    tx.auditLog.create({
      ...args,
      data: data as Prisma.AuditLogUncheckedCreateInput,
    } as AuditLogCreateArgs),
  );
}

/** Interactive / delegated transaction clients use a narrower `auditLog.create` shape than full `PrismaClient`. */
export function auditLogCreateLooseTx(
  tx: { auditLog: { create: (args: AuditLogCreateArgs) => Promise<unknown> } },
  args: LooseAuditCreateArgs,
): Promise<{
  id: string;
  action: string;
  justification: string | null;
  operatorId: string;
  createdAt: Date;
}> {
  const data = { ...args.data };
  const tenantId =
    asTenantUuid(data.tenantId) ||
    asTenantUuid(data.tenant_id) ||
    asTenantUuid(data.governance_tenant_uuid);
  if (tenantId) {
    data.tenantId = tenantId;
    if (!asTenantUuid(data.governance_tenant_uuid)) {
      data.governance_tenant_uuid = tenantId;
    }
  }
  delete data.tenant_id;
  return tx.auditLog.create({
    ...args,
    data: data as Prisma.AuditLogUncheckedCreateInput,
  } as AuditLogCreateArgs) as Promise<{
    id: string;
    action: string;
    justification: string | null;
    operatorId: string;
    createdAt: Date;
  }>;
}
