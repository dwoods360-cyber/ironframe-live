import { PrismaClient } from "@prisma/client";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

if (!(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

const prismaClientSingleton = () => {
  const base = new PrismaClient();

  async function resolveAuditTenantId(data: Record<string, unknown>): Promise<string> {
    const g = data.governance_tenant_uuid;
    if (typeof g === "string" && g.trim()) return g.trim();

    const sid = data.simThreatId;
    if (typeof sid === "string" && sid.trim()) {
      const r = await base.riskEvent.findFirst({
        where: { id: sid.trim() },
        select: { tenantId: true },
      });
      if (r?.tenantId) return r.tenantId;
    }

    const tid = data.threatId;
    if (typeof tid === "string" && tid.trim()) {
      const te = await base.threatEvent.findFirst({
        where: { id: tid.trim() },
        select: { tenantCompanyId: true },
      });
      if (te?.tenantCompanyId != null) {
        const c = await base.company.findFirst({
          where: { id: te.tenantCompanyId },
          select: { tenantId: true },
        });
        if (c?.tenantId) return c.tenantId;
      }
    }

    try {
      const cookie = await getActiveTenantUuidFromCookies();
      if (cookie) return cookie;
    } catch {
      /* non-fatal — e.g. non-request contexts */
    }

    const row = await base.tenant.findFirst({ select: { id: true }, orderBy: { id: "asc" } });
    if (row) return row.id;

    throw new Error("Prisma extension: cannot resolve AuditLog.tenant_id.");
  }

  return base.$extends({
    query: {
      auditLog: {
        async create({ args, query }) {
          const d = args.data as Record<string, unknown>;
          if (d.tenantId == null) {
            d.tenantId = await resolveAuditTenantId(d);
          }
          const sid = d.simThreatId;
          if (typeof sid === "string" && sid.trim() && d.simThreatTenantId == null) {
            const r = await base.riskEvent.findFirst({
              where: { id: sid.trim() },
              select: { tenantId: true },
            });
            d.simThreatTenantId = r?.tenantId ?? null;
          }
          return query(args);
        },
      },
      reasoningLog: {
        async create({ args, query }) {
          const d = args.data as Record<string, unknown>;
          const threatId = d.threatId;
          if (d.threatTenantId == null && typeof threatId === "string" && threatId.trim()) {
            const r = await base.riskEvent.findFirst({
              where: { id: threatId.trim() },
              select: { tenantId: true },
            });
            if (!r?.tenantId) {
              throw new Error("Prisma extension: ReasoningLog.threat_tenant_id required (shadow risk not found).");
            }
            d.threatTenantId = r.tenantId;
          }
          return query(args);
        },
        async createMany({ args, query }) {
          const rows = args.data;
          if (Array.isArray(rows)) {
            for (const raw of rows) {
              const d = raw as Record<string, unknown>;
              const threatId = d.threatId;
              if (d.threatTenantId == null && typeof threatId === "string" && threatId.trim()) {
                const r = await base.riskEvent.findFirst({
                  where: { id: threatId.trim() },
                  select: { tenantId: true },
                });
                if (!r?.tenantId) {
                  throw new Error("Prisma extension: ReasoningLog.threat_tenant_id required (shadow risk not found).");
                }
                d.threatTenantId = r.tenantId;
              }
            }
          }
          return query(args);
        },
      },
    },
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prismaExtended = globalThis.prisma ?? prismaClientSingleton();
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prismaExtended;
}

/** Extended client (audit/reasoning partition-key hydration); cast for call sites typed against base `PrismaClient`. */
const prisma = prismaExtended as unknown as PrismaClient;

export default prisma;
