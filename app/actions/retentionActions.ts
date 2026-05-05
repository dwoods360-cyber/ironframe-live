"use server";

import { unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const HIGH_RISK_RETENTION = new Set(["Defense", "Aerospace"]);

const MS_PER_DAY = 86_400_000;
const RETENTION_WINDOW_DAYS = 365;

export type RetentionViolation = {
  riskEventId: string;
  title: string;
  daysSinceAccess: number;
  pendingShred: true;
};

/**
 * Flags shadow-plane chapters that exceed the 365-day access / validation window for Defense & Aerospace tenants.
 * "Access" is proxied by `RiskEvent.updatedAt` (last simulation touch).
 */
export async function checkRetentionViolations(): Promise<
  { ok: true; violations: RetentionViolation[] } | { ok: false; error: string }
> {
  noStore();
  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (!UUID_RE.test(tenantUuid)) {
    return { ok: false, error: "Invalid tenant context." };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantUuid },
    select: { industry: true },
  });
  if (!tenant?.industry || !HIGH_RISK_RETENTION.has(tenant.industry)) {
    return { ok: true, violations: [] };
  }

  const companies = await prisma.company.findMany({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });
  const companyIds = companies.map((c) => c.id);
  if (companyIds.length === 0) {
    return { ok: true, violations: [] };
  }

  const cutoff = new Date(Date.now() - RETENTION_WINDOW_DAYS * MS_PER_DAY);
  const risks = await prisma.riskEvent.findMany({
    where: {
      tenantCompanyId: { in: companyIds },
      updatedAt: { lt: cutoff },
    },
    select: { id: true, title: true, updatedAt: true },
    take: 500,
    orderBy: { updatedAt: "asc" },
  });

  const now = Date.now();
  const violations: RetentionViolation[] = risks.map((r) => ({
    riskEventId: r.id,
    title: r.title,
    daysSinceAccess: Math.floor((now - r.updatedAt.getTime()) / MS_PER_DAY),
    pendingShred: true,
  }));

  return { ok: true, violations };
}
