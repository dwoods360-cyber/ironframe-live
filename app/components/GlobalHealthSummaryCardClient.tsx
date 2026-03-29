"use client";

import { useMemo } from "react";
import type { GlobalTelemetry } from "@/app/actions/dashboardActions";
import { useRiskStore } from "@/app/store/riskStore";
import { useGrcBotStore } from "@/app/store/grcBotStore";
import LiabilityExposureDisplay from "./LiabilityExposureDisplay";
import SlaComplianceRing from "./SlaComplianceRing";

export type SerializedCompany = {
  name: string;
  sector: string;
  risks: { status: string }[];
  policies: { status: string }[];
  industry_avg_loss_cents: number | null;
};

type Props = {
  companies: SerializedCompany[];
  telemetryData: GlobalTelemetry;
  coreintelTrendActive: boolean;
};

export default function GlobalHealthSummaryCardClient({
  companies,
  telemetryData,
  coreintelTrendActive,
}: Props) {
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const selectedTenantName = useRiskStore((s) => s.selectedTenantName);
  const grcBotEnabled = useGrcBotStore((s) => s.enabled);
  const simulatedCompanies = useGrcBotStore((s) => s.simulatedCompanies);

  const displayCompanies = useMemo(() => {
    if (grcBotEnabled && simulatedCompanies.length > 0) return simulatedCompanies;
    return companies;
  }, [grcBotEnabled, simulatedCompanies, companies]);

  const useGrcSimulatedView =
    grcBotEnabled && simulatedCompanies.length > 0;

  const { filteredCount, activeViolations } = useMemo(() => {
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
    return {
      filteredCount: filtered.length,
      activeViolations: violations,
    };
  }, [displayCompanies, selectedIndustry, selectedTenantName]);

  const middleMetric = useGrcSimulatedView ? activeViolations : telemetryData.activeCount;
  const middleLabel = useGrcSimulatedView ? "Active Violations" : "Active Threats";
  const middleHint = middleMetric > 0 ? "REQUIRES TRIAGE" : "CLEAR";

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
          <span className="text-xs tracking-wider text-slate-500 uppercase">{middleLabel}</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-light text-slate-200">{middleMetric}</span>
            <span className="text-xs text-amber-400">{middleHint}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-xs text-slate-500">
              Pipeline / DMZ pending:{" "}
              <span className="font-medium tabular-nums text-slate-400">
                {telemetryData.pipelineCount}
              </span>
            </p>
            <SlaComplianceRing
              pipelineCount={telemetryData.pipelineCount}
              slaBreachCount={telemetryData.slaBreachCount}
              oldestPipelineThreatAt={telemetryData.oldestPipelineThreatAt}
            />
          </div>
        </div>
        <div className="flex flex-col border-l border-slate-800 pl-6">
          <span className="text-xs tracking-wider text-slate-500 uppercase">Liability Exposure (USD)</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <LiabilityExposureDisplay baseUsd={telemetryData.activeExposureUsd} />
            <span className="text-xs text-slate-500">{coreintelTrendActive ? "COREINTEL TRENDING" : "ALE AT RISK"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
