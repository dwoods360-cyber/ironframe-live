"use client";

import { useMemo } from "react";
import { useRiskStore } from "@/app/store/riskStore";
import { useGrcBotStore } from "@/app/store/grcBotStore";
import LiabilityExposureDisplay from "./LiabilityExposureDisplay";

export type SerializedCompany = {
  name: string;
  sector: string;
  risks: { status: string }[];
  policies: { status: string }[];
  industry_avg_loss_cents: number | null;
};

type Props = {
  companies: SerializedCompany[];
  coreintelTrendActive: boolean;
};

export default function GlobalHealthSummaryCardClient({ companies, coreintelTrendActive }: Props) {
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const selectedTenantName = useRiskStore((s) => s.selectedTenantName);
  const grcBotEnabled = useGrcBotStore((s) => s.enabled);
  const simulatedCompanies = useGrcBotStore((s) => s.simulatedCompanies);

  const displayCompanies = useMemo(() => {
    if (grcBotEnabled && simulatedCompanies.length > 0) return simulatedCompanies;
    return companies;
  }, [grcBotEnabled, simulatedCompanies, companies]);

  const { filteredCount, activeViolations, potentialRevenueImpact } = useMemo(() => {
    const filtered = displayCompanies.filter(
      (c) => c.sector === selectedIndustry && (!selectedTenantName || c.name === selectedTenantName),
    );
    const violations = filtered.reduce(
      (sum, c) =>
        sum +
        c.risks.filter((r) => r.status === "ACTIVE").length +
        c.policies.filter((p) => p.status === "GAP DETECTED").length,
      0,
    );
    const impact = filtered.reduce((sum, c) => {
      const hasActive =
        c.risks.some((r) => r.status === "ACTIVE") ||
        c.policies.some((p) => p.status === "GAP DETECTED");
      if (hasActive && c.industry_avg_loss_cents != null) {
        return sum + Number(c.industry_avg_loss_cents) / 100;
      }
      return sum;
    }, 0);
    return {
      filteredCount: filtered.length,
      activeViolations: violations,
      potentialRevenueImpact: impact,
    };
  }, [displayCompanies, selectedIndustry, selectedTenantName]);

  return (
    <div className="border-b border-slate-800 bg-slate-900/30 p-6">
      <div className="grid grid-cols-3 gap-6">
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs tracking-wider text-slate-500 uppercase">
              Protected Tenants ({selectedIndustry})
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-light text-slate-200">{filteredCount}</span>
            <span className="text-xs text-emerald-400">100% ONLINE</span>
          </div>
        </div>
        <div className="flex flex-col border-l border-slate-800 pl-6">
          <span className="text-xs tracking-wider text-slate-500 uppercase">Active Violations</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-light text-slate-200">{activeViolations}</span>
            <span className="text-xs text-amber-400">REQUIRES TRIAGE</span>
          </div>
        </div>
        <div className="flex flex-col border-l border-slate-800 pl-6">
          <span className="text-xs tracking-wider text-slate-500 uppercase">Liability Exposure (USD)</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <LiabilityExposureDisplay baseUsd={potentialRevenueImpact} />
            <span className="text-xs text-slate-500">{coreintelTrendActive ? "COREINTEL TRENDING" : "ALE AT RISK"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
