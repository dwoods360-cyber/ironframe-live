"use client";

import { useMemo } from "react";
import { Activity, Droplets, Leaf, Zap } from "lucide-react";
import type { GlobalTelemetry } from "@/app/actions/dashboardActions";
import type { GlobalSustainabilityImpact } from "@/app/actions/sustainabilityActions";
import { useAgentStore } from "@/app/store/agentStore";
import { useRiskStore } from "@/app/store/riskStore";
import { useGrcBotStore } from "@/app/store/grcBotStore";
import { computeAverageFleetEfficiencyPct, FLEET_AGENT_COUNT } from "@/app/utils/agentFleetEfficiency";
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
  sustainabilityImpact: GlobalSustainabilityImpact;
  coreintelTrendActive: boolean;
};

export default function GlobalHealthSummaryCardClient({
  companies,
  telemetryData,
  sustainabilityImpact,
  coreintelTrendActive,
}: Props) {
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const selectedTenantName = useRiskStore((s) => s.selectedTenantName);
  const grcBotEnabled = useGrcBotStore((s) => s.enabled);
  const simulatedCompanies = useGrcBotStore((s) => s.simulatedCompanies);
  const agents = useAgentStore((s) => s.agents);
  const systemLatencyMs = useAgentStore((s) => s.systemLatencyMs);

  const fleetEfficiencyPct = useMemo(
    () => computeAverageFleetEfficiencyPct(agents, systemLatencyMs),
    [agents, systemLatencyMs],
  );

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
      <div className="mb-5 flex flex-col gap-2 rounded-lg border border-emerald-900/40 bg-slate-950/60 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/95">
            CSRD · Ironbloom
          </span>
          <span className="hidden h-3 w-px bg-slate-700 sm:block" aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Sustainability ledger
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-6">
          <span
            className="truncate font-mono text-[11px] font-semibold text-emerald-300/95"
            title={sustainabilityImpact.co2OffsetKgChip}
          >
            {sustainabilityImpact.co2OffsetKgChip}
          </span>
          <span
            className="truncate font-mono text-[11px] font-semibold text-slate-100"
            title={sustainabilityImpact.chipLineEnergy}
          >
            {sustainabilityImpact.chipLineEnergy}
          </span>
        </div>
      </div>

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

      {/* System health: fleet efficiency (19-agent model + agentStore instrumented subset) */}
      <div className="mt-5 rounded-lg border border-amber-900/35 bg-slate-950/50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-wide text-amber-400/95">
              Agent Performance
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              System Health · {FLEET_AGENT_COUNT}-agent fleet
            </span>
          </div>
          <span className="font-mono text-sm font-semibold tabular-nums text-amber-300">
            {fleetEfficiencyPct.toFixed(1)}%
          </span>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800"
          role="progressbar"
          aria-valuenow={fleetEfficiencyPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Average agent fleet efficiency"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-700/90 to-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.35)]"
            style={{ width: `${Math.min(100, fleetEfficiencyPct)}%` }}
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-700/90 bg-slate-950/50 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-200">
            Outcome Reporting · Sustainability (Ironbloom)
          </h3>
          <span className="text-[9px] font-mono uppercase text-slate-500">
            {sustainabilityImpact.recordCount} ledger{" "}
            {sustainabilityImpact.recordCount === 1 ? "entry" : "entries"}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2.5">
            <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Energy</div>
              <div className="mt-1 font-mono text-sm font-semibold text-slate-100">
                {sustainabilityImpact.energySavedLine}
              </div>
              <div className="mt-0.5 text-[9px] text-slate-500">Ledger total (kWh)</div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2.5">
            <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden />
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Water</div>
              <div className="mt-1 font-mono text-sm font-semibold text-slate-100">
                {sustainabilityImpact.waterAvertedLine}
              </div>
              <div className="mt-0.5 text-[9px] text-slate-500">Cooling water averted (L)</div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2.5">
            <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Carbon</div>
              <div className="mt-1 font-mono text-sm font-semibold text-emerald-300/95">
                {sustainabilityImpact.totalOffsetKgCo2eLine}
              </div>
              <div className="mt-0.5 text-[9px] text-slate-500">grams ÷ 1000 → kg CO2e</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
