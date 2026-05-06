import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

type AuditLogCreateArgs = Parameters<typeof prisma.auditLog.create>[0];

/**
 * `tenant_id` / `sim_threat_tenant_id` are hydrated at runtime by the Prisma extension in `lib/prisma.ts`.
 * This wrapper relaxes compile-time checks for call sites.
 */
export function auditLogCreateLoose(
  args: Omit<AuditLogCreateArgs, "data"> & { data: Record<string, unknown> },
) {
  return prisma.auditLog.create({
    ...args,
    data: args.data as Prisma.AuditLogUncheckedCreateInput,
  } as AuditLogCreateArgs);
}

/** Interactive / delegated transaction clients use a narrower `auditLog.create` shape than full `PrismaClient`. */
export function auditLogCreateLooseTx(tx: any, args: Omit<AuditLogCreateArgs, "data"> & { data: Record<string, unknown> }) {
  return tx.auditLog.create({
    ...args,
    data: args.data as Prisma.AuditLogUncheckedCreateInput,
  } as AuditLogCreateArgs);
}
