"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { Activity, Droplets, Leaf, Zap } from "lucide-react";
import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import { useAgentRiskStore } from "@/app/store/agentRiskStore";
import type { GlobalTelemetry } from "@/app/actions/dashboardActions";
import type { GlobalSustainabilityImpact } from "@/lib/sustainability/globalSustainabilityImpact";
import { IRONBLOOM_PRODUCTION_LABEL } from "@/app/config/agents";
import { useAgentStore } from "@/app/store/agentStore";
import { useRiskStore } from "@/app/store/riskStore";
import { useGrcBotStore } from "@/app/store/grcBotStore";
import { computeAverageFleetEfficiencyPct, FLEET_AGENT_COUNT } from "@/app/utils/agentFleetEfficiency";
import { usePlatformAdminToolsAccess } from "@/app/hooks/usePlatformAdminToolsAccess";
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

type IronbloomMetricProps = {
  icon: ReactNode;
  /** Full forensic line (label + physical units), e.g. `Energy Saved: 1,200 kWh`. */
  metricLine: string;
  valueClassName?: string;
};

function splitIronbloomMetricLine(metricLine: string): { label: string; value: string } {
  const colon = metricLine.indexOf(": ");
  if (colon < 0) return { label: metricLine, value: "" };
  return {
    label: `${metricLine.slice(0, colon)}:`,
    value: metricLine.slice(colon + 2),
  };
}

/** Single-line metric block — icon + label/value on one baseline (no vertical stack). */
function IronbloomMetricBlock({
  icon,
  metricLine,
  valueClassName = "text-slate-100",
}: IronbloomMetricProps) {
  const { label, value } = splitIronbloomMetricLine(metricLine);

  return (
    <div
      role="listitem"
      className="flex w-full min-w-0 flex-1 flex-row flex-nowrap items-center gap-x-4 whitespace-nowrap"
    >
      <span className="flex shrink-0 items-center self-center">{icon}</span>
      <span
        className="flex flex-row flex-nowrap items-baseline gap-x-4 whitespace-nowrap"
        title={metricLine}
      >
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span
          className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${valueClassName}`}
        >
          {value}
        </span>
      </span>
    </div>
  );
}

export default function GlobalHealthSummaryCardClient({
  companies,
  telemetryData,
  sustainabilityImpact,
  coreintelTrendActive,
}: Props) {
  const { canUsePlatformAdminTools } = usePlatformAdminToolsAccess();
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

  const byIndex = useAgentRiskStore((s) => s.byIndex);
  const ironlockFreeze = useAgentRiskStore((s) => s.ironlockGlobalStateFreeze);
  const operationalAgentCount = useMemo(() => {
    if (ironlockFreeze) {
      return 0;
    }
    return CORE_WORKFORCE_AGENTS.filter((a) => (byIndex[a.index]?.riskLevel ?? "low") === "low").length;
  }, [byIndex, ironlockFreeze]);

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
    <div className="w-full border-b border-slate-800 bg-slate-900/30 p-6">
      <div className="mb-5 flex flex-row flex-nowrap items-center justify-between gap-x-4 overflow-x-auto rounded-lg border border-emerald-900/40 bg-slate-950/60 px-4 py-3">
        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/95">
            CSRD · {IRONBLOOM_PRODUCTION_LABEL}
          </span>
          <span className="h-3 w-px bg-slate-700" aria-hidden />
          <span
            className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500"
            title={`${IRONBLOOM_PRODUCTION_LABEL} (production): physical units only (kWh, L, km); monetary-only sustainability data rejected (TAS).`}
          >
            Sustainability ledger
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-row items-center justify-end gap-x-6 whitespace-nowrap">
          <span
            className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-emerald-300/95"
            title={sustainabilityImpact.co2OffsetKgChip}
          >
            {sustainabilityImpact.co2OffsetKgChip}
          </span>
          <span
            className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-slate-100"
            title={sustainabilityImpact.chipLineEnergy}
          >
            {sustainabilityImpact.chipLineEnergy}
          </span>
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-2">
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
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canUsePlatformAdminTools ? (
            <Link
              href="/op-support#workforce"
              className="inline-flex items-center gap-2 rounded border border-slate-700/80 bg-slate-900/50 px-2.5 py-1.5 text-[10px] text-slate-300 transition-colors hover:border-emerald-600/40 hover:bg-slate-900 hover:text-emerald-100"
              title="Open Workforce Command Post on Operational Support"
            >
              <span className="font-mono tabular-nums text-slate-200">
                Workforce Status: {operationalAgentCount}/{FLEET_AGENT_COUNT}{" "}
                {operationalAgentCount === FLEET_AGENT_COUNT ? "Operational" : "Degraded"}
              </span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 rounded border border-slate-800/80 bg-slate-950/40 px-2.5 py-1.5 text-[10px] text-slate-500">
              <span className="font-mono tabular-nums text-slate-400">
                Workforce Status: {operationalAgentCount}/{FLEET_AGENT_COUNT}{" "}
                {operationalAgentCount === FLEET_AGENT_COUNT ? "Operational" : "Degraded"}
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 flex w-full min-w-0 flex-col gap-3 rounded-xl border border-slate-700/90 bg-slate-950/50 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="flex w-full flex-row flex-nowrap items-center justify-between gap-x-4">
          <h3 className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] text-slate-200">
            Outcome Reporting · Sustainability ({IRONBLOOM_PRODUCTION_LABEL})
          </h3>
          <span className="whitespace-nowrap text-[9px] font-mono uppercase text-slate-500">
            {sustainabilityImpact.recordCount} ledger{" "}
            {sustainabilityImpact.recordCount === 1 ? "entry" : "entries"}
          </span>
        </div>
        <div
          className="flex w-full min-w-0 flex-row flex-nowrap items-center justify-between gap-x-6 overflow-x-auto"
          role="list"
          aria-label="Ironbloom physical unit metrics"
        >
          <IronbloomMetricBlock
            icon={<Zap className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />}
            metricLine={sustainabilityImpact.energySavedLine}
          />
          <IronbloomMetricBlock
            icon={<Droplets className="h-4 w-4 shrink-0 text-sky-400" aria-hidden />}
            metricLine={sustainabilityImpact.waterAvertedLine}
          />
          <IronbloomMetricBlock
            icon={<Leaf className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />}
            metricLine={sustainabilityImpact.totalOffsetKgCo2eLine}
            valueClassName="text-emerald-300/95"
          />
        </div>
      </div>
    </div>
  );
}
