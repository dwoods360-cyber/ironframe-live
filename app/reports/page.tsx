import prisma from "@/lib/prisma";
import { getRecentAuditLogs } from "@/app/actions/auditActions";
import { getGlobalTelemetry } from "@/app/actions/dashboardActions";
import { getGlobalSustainabilityImpact } from "@/lib/sustainability/globalSustainabilityImpact";
import { readGovernanceMaturityState } from "@/app/lib/governanceMaturityState";
import { computeCostOfNonCompliance, resolveGovernanceBaselineMode } from "@/app/utils/financialRisk";
import ExecutiveSummary from "../components/ExecutiveSummary";
import SimulationHud from "../components/SimulationHud";
import RiskScenarioSimulator from "../components/RiskScenarioSimulator";
import SaaSPricingModel from "../components/SaaSPricingModel";
import ReportsFooter from "../components/ReportsFooter";
import GrcReportFrameworkGrid from "../components/GrcReportFrameworkGrid";
import ReportsEnvironmentalImpactSection from "../components/ReportsEnvironmentalImpactSection";
import ReportsPageHeader from "../components/ReportsPageHeader";

export default async function ReportsPage() {
  const [companies, telemetryData, auditLogs, sustainabilityImpact, maturityStateInitial, systemCfg] = await Promise.all([
    prisma.company.findMany({
      include: { policies: true, risks: true },
    }),
    getGlobalTelemetry(),
    getRecentAuditLogs(10),
    getGlobalSustainabilityImpact(),
    readGovernanceMaturityState(),
    prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: {
        autonomousCarbonMitigation: true,
        selfHealingActiveSince: true,
        sustainabilityLiveApiDegraded: true,
      },
    }),
  ]);

  let maturityState = maturityStateInitial;
  const dbStale = systemCfg?.sustainabilityLiveApiDegraded === true;
  if (dbStale !== (maturityState.current.apiOutagePenaltyActive === true)) {
    const { recalculateSystemMaturityScore } = await import("@/app/services/governanceScoring");
    maturityState = await recalculateSystemMaturityScore({ trigger: "IRONWATCH_REPORTS_SYNC" });
  }

  const potentialRevenueImpact = companies.reduce((sum, company) => {
    const hasActiveThreat =
      company.risks.some((r) => r.status === "ACTIVE") ||
      company.policies.some((p) => p.status === "GAP DETECTED");
    if (hasActiveThreat && company.industry_avg_loss_cents != null) {
      return sum + Number(company.industry_avg_loss_cents) / 100;
    }
    return sum;
  }, 0);

  const baselineByIndustry: Record<string, number> = {};
  for (const company of companies) {
    const sector = company.sector;
    const hasActiveThreat =
      company.risks.some((r) => r.status === "ACTIVE") ||
      company.policies.some((p) => p.status === "GAP DETECTED");
    const impact = hasActiveThreat && company.industry_avg_loss_cents != null
      ? Number(company.industry_avg_loss_cents) / 100
      : 0;
    baselineByIndustry[sector] = (baselineByIndustry[sector] ?? 0) + impact;
  }

  const tenantKey = "medshield";
  const daysElapsed =
    systemCfg?.autonomousCarbonMitigation === true && systemCfg.selfHealingActiveSince
      ? Math.floor((Date.now() - systemCfg.selfHealingActiveSince.getTime()) / 86_400_000)
      : 0;
  const bonusActive =
    systemCfg?.autonomousCarbonMitigation === true && daysElapsed >= 30;
  const streakSummary =
    systemCfg?.autonomousCarbonMitigation !== true
      ? "Self-healing off — continuity bonus unavailable."
      : bonusActive
        ? "Verified 30-day continuity (+0.5 maturity bonus applied in scoring)."
        : `Day ${Math.min(daysElapsed + 1, 30)}/30 toward +0.5 maturity bonus.`;

  const gavelConc = computeCostOfNonCompliance(maturityState.current.score, {
    tenantKey,
    baselineMode: resolveGovernanceBaselineMode(tenantKey),
    sustainabilityAleCents: "0",
    carbonPenaltyAvoidedCents: "0",
    selfHealingResilienceBonusActive: bonusActive,
  });

  const staleData = maturityState.current.apiOutagePenaltyActive === true;

  const cfoResilienceGavel = {
    maturityScore: maturityState.current.score,
    maturityDisplayLabel: staleData ? "Degraded (API Outage)" : undefined,
    streakSummary,
    staleDataLiabilityNarrative: staleData
      ? "Ironwatch (Agent 15): the external sustainability live feed has exceeded the 4-hour stale threshold. The constitutional industry ALE baseline (including defense at roughly $1.6B) remains protected by Last Known Good (LKG) ledger rows and sealed artifacts; probabilistic liability from carbon and grid-regulatory posture is nonetheless elevated until real-time Electricity Maps awareness returns."
      : undefined,
    gavelNarrative:
      gavelConc.resilienceGavelNarrative ??
      (systemCfg?.autonomousCarbonMitigation === true
        ? "Automated environmental controls under continuity review: regulators contrast sustained self-healing against manual-only operation when scoring oversight exposure."
        : "Disabling autonomous self-healing resets the 30-day streak and invites scrutiny of manual vs. automated control evidence — governance dividend compression risk rises."),
    dividendAtRiskDisplay: gavelConc.resilienceBonusDividendAtRiskDisplay,
  };

  return (
    <main className="min-h-screen bg-slate-950">
      <ReportsPageHeader co2OffsetChip={sustainabilityImpact.co2OffsetKgChip} />

      <SimulationHud />

      <div className="px-4 pt-2 pb-4">
        <RiskScenarioSimulator />
      </div>

      <ExecutiveSummary
        baselineLiabilityUsd={potentialRevenueImpact}
        baselineByIndustry={baselineByIndustry}
        telemetryData={telemetryData}
        auditLogs={auditLogs}
        sustainabilityImpact={sustainabilityImpact}
        cfoResilienceGavel={cfoResilienceGavel}
      />

      <div className="p-6">
        <GrcReportFrameworkGrid />

        <ReportsEnvironmentalImpactSection data={sustainabilityImpact} />

        <div className="mt-6">
          <SaaSPricingModel />
        </div>
      </div>

      <ReportsFooter />
    </main>
  );
}
