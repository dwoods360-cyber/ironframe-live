import prisma from "@/lib/prisma";
import { getRecentAuditLogs } from "@/app/actions/auditActions";
import { getGlobalTelemetry } from "@/app/actions/dashboardActions";
import ExecutiveSummary from "../components/ExecutiveSummary";
import SimulationHud from "../components/SimulationHud";
import RiskScenarioSimulator from "../components/RiskScenarioSimulator";
import SaaSPricingModel from "../components/SaaSPricingModel";
import ReportsFooter from "../components/ReportsFooter";
import GrcReportFrameworkGrid from "../components/GrcReportFrameworkGrid";
import ReportsPageHeader from "../components/ReportsPageHeader";

export default async function ReportsPage() {
  const [companies, telemetryData, auditLogs] = await Promise.all([
    prisma.company.findMany({
      include: { policies: true, risks: true },
    }),
    getGlobalTelemetry(),
    getRecentAuditLogs(10),
  ]);

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

  return (
    <main className="min-h-screen bg-slate-950">
      <ReportsPageHeader />

      <SimulationHud />

      <div className="px-4 pt-2 pb-4">
        <RiskScenarioSimulator />
      </div>

      <ExecutiveSummary
        baselineLiabilityUsd={potentialRevenueImpact}
        baselineByIndustry={baselineByIndustry}
        telemetryData={telemetryData}
        auditLogs={auditLogs}
      />

      <div className="p-6">
        <GrcReportFrameworkGrid />

        <div className="mt-6">
          <SaaSPricingModel />
        </div>
      </div>

      <ReportsFooter />
    </main>
  );
}
