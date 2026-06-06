import "server-only";

import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import { aggregateProductionMitigatedValueCents } from "@/app/lib/ironbloom/productionCarbonLedger";
import { calculateBudgetJustification } from "@/app/utils/grcMath";
import { fetchInsuranceModelForTenant } from "@/app/utils/insuranceTenantModel";
import { calculateInsuranceIncentive } from "@/app/utils/insuranceMath";

const DEFAULT_PREMIUM_CENTS = 5_000_000n;

function parsePremiumBasisCents(raw: string | null | undefined): bigint {
  if (raw == null) return DEFAULT_PREMIUM_CENTS;
  const trimmed = String(raw).trim().replace(/,/g, "");
  if (!trimmed || !/^\d+$/.test(trimmed)) return DEFAULT_PREMIUM_CENTS;
  try {
    const parsed = BigInt(trimmed);
    return parsed > 0n ? parsed : DEFAULT_PREMIUM_CENTS;
  } catch {
    return DEFAULT_PREMIUM_CENTS;
  }
}

export type FinancialIntegrityLedgerDbSnapshot = {
  isSimulationMode: boolean;
  framework: string;
  hasContinuousMonitoring: boolean;
  hasDueDiligencePdfs: boolean;
  /** Shadow-plane YTD budget justification sum (RiskEvent BIGINT cents). */
  totalValueMitigatedYtdCents: string;
  /** Production SustainabilityMetric mitigated_value_cents aggregate. */
  carbonMitigatedValueCents: string;
  /** Modeled renewal savings for premium basis (BIGINT cents string). */
  projectedInsuranceSavingsCents: string;
  defaultPremiumCents: string;
  complianceVelocity: number | null;
  incentive: {
    baseFrameworkDiscountBps: number;
    continuousMonitoringBps: number;
    forensicsBps: number;
    totalDiscountBps: number;
    totalEstimatedSavings_cents: string;
  };
};

/**
 * Loads financial integrity ledger aggregates from Prisma BIGINT columns (no float division on money).
 */
export async function fetchFinancialIntegrityLedgerDbSnapshot(
  activeTenantUuid: string,
  premiumBasisCentsRaw?: string | null,
): Promise<FinancialIntegrityLedgerDbSnapshot> {
  const simPlane = await readSimulationPlaneEnabled();
  const premiumBasisCents = parsePremiumBasisCents(premiumBasisCentsRaw);

  const companies = await prisma.company.findMany({
    where: { tenantId: activeTenantUuid },
    select: { id: true },
  });
  const tenantCompanyIds = companies.map((c) => c.id);

  let totalValueMitigatedYtdCents = 0n;
  if (simPlane && tenantCompanyIds.length > 0) {
    const ytdStart = new Date();
    ytdStart.setUTCMonth(0, 1);
    ytdStart.setUTCHours(0, 0, 0, 0);
    const closedYtd = await prisma.riskEvent.findMany({
      where: {
        tenantCompanyId: { in: tenantCompanyIds },
        status: { in: [ThreatState.RESOLVED, ThreatState.CLOSED_ARCHIVED] },
        updatedAt: { gte: ytdStart },
      },
      select: {
        financialRisk_cents: true,
        complianceFramework: true,
        ingestionDetails: true,
      },
    });
    for (const ev of closedYtd) {
      totalValueMitigatedYtdCents += calculateBudgetJustification(ev).totalValueCreatedCents;
    }
  }

  const carbonMitigatedValueCents = await aggregateProductionMitigatedValueCents(activeTenantUuid);

  const insuranceModel = await fetchInsuranceModelForTenant(activeTenantUuid);
  const incentive = calculateInsuranceIncentive({
    basePremium_cents: premiumBasisCents,
    framework: insuranceModel.framework,
    hasContinuousMonitoring: insuranceModel.hasContinuousMonitoring,
    hasDueDiligencePdfs: insuranceModel.hasDueDiligencePdfs,
  });

  return {
    isSimulationMode: simPlane,
    framework: insuranceModel.framework,
    hasContinuousMonitoring: insuranceModel.hasContinuousMonitoring,
    hasDueDiligencePdfs: insuranceModel.hasDueDiligencePdfs,
    totalValueMitigatedYtdCents: totalValueMitigatedYtdCents.toString(),
    carbonMitigatedValueCents: carbonMitigatedValueCents.toString(),
    projectedInsuranceSavingsCents: incentive.totalEstimatedSavings_cents.toString(),
    defaultPremiumCents: premiumBasisCents.toString(),
    complianceVelocity: null,
    incentive: {
      baseFrameworkDiscountBps: incentive.baseFrameworkDiscountBps,
      continuousMonitoringBps: incentive.continuousMonitoringBps,
      forensicsBps: incentive.forensicsBps,
      totalDiscountBps: incentive.totalDiscountBps,
      totalEstimatedSavings_cents: incentive.totalEstimatedSavings_cents.toString(),
    },
  };
}
