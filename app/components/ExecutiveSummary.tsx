"use client";

import { useEffect, useMemo } from "react";
import { useReportStore } from "@/app/store/reportStore";
import { useRiskStore } from "@/app/store/riskStore";
import { useScenarioStore } from "@/app/store/scenarioStore";
import { useAgentStore } from "@/app/store/agentStore";
import { formatRiskExposure } from "@/app/utils/riskFormatting";
import { computeAverageFleetEfficiencyPct } from "@/app/utils/agentFleetEfficiency";
import type { RecentAuditLogRow } from "@/app/actions/auditActions";
import type { GlobalTelemetry } from "@/app/actions/dashboardActions";
import type { GlobalSustainabilityImpact } from "@/app/actions/sustainabilityActions";
import { Leaf } from "lucide-react";

function formatOperatorDisplay(operatorId: string): string {
  const id = operatorId.trim();
  if (id.length <= 14) return id;
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);
  if (uuidLike) return `${id.slice(0, 8)}…`;
  return `${id.slice(0, 12)}…`;
}

type ExecutiveSummaryProps = {
  /** Total baseline liability (all industries) - used when baselineByIndustry not provided */
  baselineLiabilityUsd: number;
  /** Per-industry baseline liability for industry-specific reporting */
  baselineByIndustry?: Record<string, number>;
  /** Live ledger from ThreatEvent aggregates (tenant-scoped). */
  telemetryData: GlobalTelemetry;
  /** Tenant-scoped AuditLog rows from the primary DB. */
  auditLogs: RecentAuditLogRow[];
  /** Ironbloom ledger (tenant-scoped); JSON-serializable numbers only. */
  sustainabilityImpact: GlobalSustainabilityImpact;
};

export default function ExecutiveSummary({
  baselineLiabilityUsd,
  baselineByIndustry,
  telemetryData,
  auditLogs,
  sustainabilityImpact,
}: ExecutiveSummaryProps) {
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const pipelineThreats = useRiskStore((s) => s.pipelineThreats);
  const acceptedThreatImpacts = useRiskStore((s) => s.acceptedThreatImpacts);
  const acceptedThreatIndustries = useRiskStore((s) => s.acceptedThreatIndustries);

  const { activeScenario, multiplier } = useScenarioStore();

  const { slaCompliancePct, agentEfficiencyCount, recentEvents, refresh } = useReportStore();
  const agents = useAgentStore((s) => s.agents);
  const systemLatencyMs = useAgentStore((s) => s.systemLatencyMs);
  const fleetEfficiencyPct = useMemo(
    () => computeAverageFleetEfficiencyPct(agents, systemLatencyMs),
    [agents, systemLatencyMs],
  );

  useEffect(() => {
    refresh();
  }, [refresh, selectedIndustry]);

  const baselineForIndustry =
    baselineByIndustry && selectedIndustry
      ? baselineByIndustry[selectedIndustry] ?? 0
      : baselineLiabilityUsd;

  const liveCurrentUsd = telemetryData.activeExposureUsd;
  const liveMitigatedUsd = telemetryData.mitigatedExposureUsd;

  const pipelineM = pipelineThreats
    .filter((t) => !selectedIndustry || t.industry === selectedIndustry)
    .reduce((sum, t) => sum + (t.score ?? t.loss), 0);
  const acceptedM = Object.entries(acceptedThreatImpacts).reduce(
    (sum, [id, impact]) =>
      sum + (acceptedThreatIndustries[id] === selectedIndustry ? impact : 0),
    0,
  );

  const handleDownloadPdf = () => {
    if (typeof window === "undefined") return;
    const title = `${selectedIndustry} Board-Ready GRC Report`;
    const prevTitle = document.title;
    document.title = title;
    window.print();
    document.title = prevTitle;
  };

  const burnDownPercent =
    baselineForIndustry > 0
      ? Math.min(100, (liveCurrentUsd / baselineForIndustry) * 100)
      : 0;

  const currencyMagnitude = useRiskStore((s) => s.currencyMagnitude);
  const liabilityExposureUsd = baselineForIndustry + acceptedM * 1e6 + pipelineM * 1e6;
  let adjustedLiabilityExposureUsd = liabilityExposureUsd;
  let adjustedBaselineUsd = baselineForIndustry;
  let adjustedCurrentUsd = liveCurrentUsd;
  let adjustedMitigatedUsd = liveMitigatedUsd;
  if (activeScenario && multiplier !== 1) {
    adjustedLiabilityExposureUsd = adjustedLiabilityExposureUsd * multiplier;
    adjustedBaselineUsd = adjustedBaselineUsd * multiplier;
    adjustedCurrentUsd = adjustedCurrentUsd * multiplier;
    adjustedMitigatedUsd = adjustedMitigatedUsd * multiplier;
  }

  const formattedExposure = formatRiskExposure(adjustedLiabilityExposureUsd, currencyMagnitude);
  const formattedBaseline = formatRiskExposure(adjustedBaselineUsd, currencyMagnitude);
  const formattedCurrent = formatRiskExposure(adjustedCurrentUsd, currencyMagnitude);
  const formattedMitigated = formatRiskExposure(adjustedMitigatedUsd, currencyMagnitude);

  return (
    <section className="border-b border-slate-800 bg-[#020617]/80 px-4 py-6">
      {/* Print-only header: industry name + primary liability metric */}
      <div className="hidden print:block border-b border-slate-700 bg-slate-900/80 px-4 py-3 mb-4">
        <h1 className="text-sm font-black uppercase tracking-wider text-white">
          {selectedIndustry} Board-Ready GRC Report
        </h1>
        <p className="mt-1 text-xs font-bold text-red-400">
          Liability Exposure ({activeScenario ? "Projected" : "Active"}): ${formattedExposure}
        </p>
      </div>

      <div className="mx-auto max-w-5xl rounded-xl border border-slate-800 bg-[#0f172a]/50 backdrop-blur-md p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">Executive Summary</h2>
            <p className="mt-1 text-[11px] text-slate-400">
              Board-ready view of GRC posture, SLA performance, and agent-driven ROI.
              {selectedIndustry && (
                <span className="ml-1 rounded border border-slate-600 bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-300">
                  {selectedIndustry}
                </span>
              )}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-800/80 pt-2 text-[10px] text-slate-400">
              <span>
                Total Threats (Active):{" "}
                <span className="font-mono font-semibold text-slate-100">{telemetryData.activeCount}</span>
              </span>
              <span className="hidden text-slate-600 sm:inline" aria-hidden>
                |
              </span>
              <span className="text-amber-400/95">
                System Pulse · Avg. Efficiency{" "}
                <span className="font-mono font-semibold text-amber-200">{fleetEfficiencyPct.toFixed(1)}%</span>
              </span>
              <span className="hidden text-slate-600 sm:inline" aria-hidden>
                |
              </span>
              <span className="text-slate-500">
                Sentinel sweeps (audit):{" "}
                <span className="font-mono text-slate-400">{agentEfficiencyCount}</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="rounded border border-slate-600 bg-slate-900/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-100 hover:border-emerald-400 hover:text-emerald-200"
          >
            Download PDF
          </button>
        </div>

        {/* Top metrics row */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Risk Burn-down */}
          <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {activeScenario ? "Projected Risk Burn-down" : "Risk Burn-down"}
            </div>
            <div className="mt-2 flex items-baseline justify-between text-xs text-slate-300">
              <span>Baseline</span>
              <span className="font-mono text-slate-400">${formattedBaseline}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between text-xs text-slate-300">
              <span>Current Risk</span>
              <span className="font-mono text-emerald-400">${formattedCurrent}</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                style={{ width: `${Math.min(100, burnDownPercent)}%` }}
              />
            </div>
            <div className="mt-2 text-[10px] text-slate-400">
              Total mitigated risk: <span className="font-mono text-emerald-300">${formattedMitigated}</span>
            </div>
          </div>

          {/* SLA Compliance */}
          <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">SLA Compliance</div>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-light text-emerald-400">{slaCompliancePct.toFixed(0)}%</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                triaged &lt; 72 hours
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Measured from first triage decision (Acknowledged / De-Acknowledged) to Processed state.
            </p>
          </div>

          {/* CSRD / Ironbloom — live sustainability ledger */}
          <div className="rounded-lg border border-emerald-900/50 bg-slate-950/40 p-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-emerald-400/90">
              <Leaf className="h-3.5 w-3.5 shrink-0" aria-hidden />
              CSRD · Ironbloom
            </div>
            <div className="mt-3 font-mono text-lg font-semibold leading-tight text-emerald-300">
              {sustainabilityImpact.co2OffsetKgChip}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-slate-400">
              Outcome reporting: verified CO₂e offset from resolved threats (SustainabilityMetric ledger). Use System
              Pulse above for fleet health.
            </p>
          </div>
        </div>

        {/* Audit Summary */}
        <div className="mt-6 rounded-lg border border-slate-700 bg-slate-950/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">GRC Audit Summary</span>
            <span className="text-[10px] text-slate-500">Last 10 events</span>
          </div>
          <div className="overflow-hidden rounded-md border border-slate-800">
            <table className="min-w-full border-collapse text-[10px]">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">
                    Timestamp
                  </th>
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">User</th>
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Action</th>
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">
                    Justification
                  </th>
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-3 text-center text-[11px] text-slate-500 bg-slate-950/60"
                    >
                      No GRC audit events recorded yet.
                    </td>
                  </tr>
                )}
                {auditLogs.map((row) => (
                  <tr key={row.id}>
                    <td className="border-t border-slate-800 px-3 py-2 text-slate-300">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="border-t border-slate-800 px-3 py-2 font-mono text-slate-300" title={row.operatorId}>
                      {formatOperatorDisplay(row.operatorId)}
                    </td>
                    <td className="border-t border-slate-800 px-3 py-2 text-slate-300">{row.action}</td>
                    <td className="border-t border-slate-800 px-3 py-2 text-rose-300">
                      {row.justification ?? "—"}
                    </td>
                    <td className="border-t border-slate-800 px-3 py-2">
                      <span className="inline-flex rounded border border-emerald-600/50 bg-emerald-950/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-400">
                        Verified
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

