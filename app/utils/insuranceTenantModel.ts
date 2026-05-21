import { subHours } from "date-fns";
import prisma from "@/lib/prisma";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import { calculateInsuranceIncentive, type InsuranceIncentiveResult } from "@/app/utils/insuranceMath";

export type InsuranceTenantModel = {
  framework: string;
  /** Tenant `industry` for glossary / $ALE$ sector context (may be null). */
  industry: string | null;
  hasContinuousMonitoring: boolean;
  hasDueDiligencePdfs: boolean;
  incentive: InsuranceIncentiveResult;
};

/**
 * Loads dominant framework, Ironwatch activity (last hour), and due-diligence artifact presence
 * for the dashboard tenant. Used by HUD, Budget Justification, and actuarial PDF export.
 */
export async function fetchInsuranceModelForTenant(activeTenantUuid: string): Promise<InsuranceTenantModel> {
  const simPlane = await readSimulationPlaneEnabled();

  const [tenantRow, companies] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: activeTenantUuid },
      select: { industry: true },
    }),
    prisma.company.findMany({
      where: { tenantId: activeTenantUuid },
      select: { id: true },
    }),
  ]);
  const industry = tenantRow?.industry?.trim() || null;
  const tenantCompanyIds = companies.map((c) => c.id);

  if (!simPlane || tenantCompanyIds.length === 0) {
    const incentive = calculateInsuranceIncentive({
      framework: "SOC2",
      hasContinuousMonitoring: false,
      hasDueDiligencePdfs: false,
    });
    return {
      framework: "SOC2",
      industry,
      hasContinuousMonitoring: false,
      hasDueDiligencePdfs: false,
      incentive,
    };
  }

  const oneHourAgo = subHours(new Date(), 1);

  const [fwRows, ironwatchRecent, ddCount] = await Promise.all([
    prisma.riskEvent.findMany({
      where: { tenantCompanyId: { in: tenantCompanyIds } },
      select: { complianceFramework: true },
      take: 600,
    }),
    prisma.reasoningLog.count({
      where: {
        createdAt: { gte: oneHourAgo },
        agentName: "Ironwatch",
        threat: { tenantCompanyId: { in: tenantCompanyIds } },
      },
    }),
    prisma.riskEvent.count({
      where: {
        tenantCompanyId: { in: tenantCompanyIds },
        postMortemReportPath: { not: null },
      },
    }),
  ]);

  const fwCounts = new Map<string, number>();
  for (const r of fwRows) {
    const k = String(r.complianceFramework ?? "SOC2");
    fwCounts.set(k, (fwCounts.get(k) ?? 0) + 1);
  }
  let framework = "SOC2";
  let best = 0;
  for (const [k, c] of fwCounts) {
    if (c > best) {
      best = c;
      framework = k;
    }
  }
  const hasContinuousMonitoring = ironwatchRecent > 0;
  const hasDueDiligencePdfs = ddCount > 0;

  const incentive = calculateInsuranceIncentive({
    framework,
    hasContinuousMonitoring,
    hasDueDiligencePdfs,
  });

  return {
    framework,
    industry,
    hasContinuousMonitoring,
    hasDueDiligencePdfs,
    incentive,
  };
}
