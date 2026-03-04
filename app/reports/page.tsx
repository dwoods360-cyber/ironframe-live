import prisma from "@/lib/prisma";
import Link from "next/link";
import { FileText } from "lucide-react";
import ExecutiveSummary from "../components/ExecutiveSummary";
import SimulationHud from "../components/SimulationHud";
import RiskScenarioSimulator from "../components/RiskScenarioSimulator";
import SaaSPricingModel from "../components/SaaSPricingModel";
import ReportsFooter from "../components/ReportsFooter";
import ReportsPageHeader from "../components/ReportsPageHeader";

const REPORT_GROUPS = [
  {
    title: "HEALTHCARE",
    reports: [
      { label: "HIPAA Compliance", href: "/reports/hipaa-audit" },
      { label: "Patient Data Access", href: "/reports/patient-data-access" },
      { label: "HITECH Security", href: "/reports/hitech-security" },
      { label: "EHR Integrity", href: "/reports/ehr-integrity" },
    ],
  },
  {
    title: "FINANCIAL",
    reports: [
      { label: "PCI-DSS Level 1", href: "/reports/pci-dss-level-1" },
      { label: "SWIFT Connectivity", href: "/reports/swift-connectivity" },
      { label: "SOX Controls", href: "/reports/sox-controls" },
      { label: "AML Trace", href: "/reports/aml-trace" },
    ],
  },
  {
    title: "ENERGY",
    reports: [
      { label: "NERC CIP Asset List", href: "/reports/nerc-cip-asset-list" },
      { label: "SCADA Traffic", href: "/reports/scada-traffic" },
      { label: "FEMA Resilience", href: "/reports/fema-resilience" },
      { label: "GridEx VII", href: "/reports/gridex-vii" },
    ],
  },
] as const;

export default async function ReportsPage() {
  const companies = await prisma.company.findMany({
    include: { policies: true, risks: true },
  });

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
      />

      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {REPORT_GROUPS.map((group) => (
            <section
              key={group.title}
              className="rounded border border-slate-800 bg-slate-900/50 p-4"
            >
              <div className="mb-3 border-b border-slate-800 pb-2">
                <h2 className="text-[11px] font-bold uppercase tracking-wide text-white">
                  {group.title}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.reports.map((report) => (
                  <Link
                    key={report.href}
                    href={report.href}
                    className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-[10px] text-slate-300 transition-all hover:border-blue-500 hover:text-white"
                  >
                    <FileText className="h-3 w-3" />
                    {report.label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6">
          <SaaSPricingModel />
        </div>
      </div>

      <ReportsFooter />
    </main>
  );
}
