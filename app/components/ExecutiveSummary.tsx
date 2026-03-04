"use client";

import { useEffect } from "react";
import { useReportStore } from "@/app/store/reportStore";
import { useRiskStore } from "@/app/store/riskStore";
import { useScenarioStore } from "@/app/store/scenarioStore";
import { formatRiskExposure } from "@/app/utils/riskFormatting";

type ExecutiveSummaryProps = {
  /** Total baseline liability (all industries) - used when baselineByIndustry not provided */
  baselineLiabilityUsd: number;
  /** Per-industry baseline liability for industry-specific reporting */
  baselineByIndustry?: Record<string, number>;
};

export default function ExecutiveSummary({
  baselineLiabilityUsd,
  baselineByIndustry,
}: ExecutiveSummaryProps) {
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const pipelineThreats = useRiskStore((s) => s.pipelineThreats);
  const acceptedThreatImpacts = useRiskStore((s) => s.acceptedThreatImpacts);
  const acceptedThreatIndustries = useRiskStore((s) => s.acceptedThreatIndustries);

  const { activeScenario, multiplier } = useScenarioStore();

  const {
    totalMitigatedRiskM,
    slaCompliancePct,
    agentEfficiencyCount,
    recentEvents,
    refresh,
  } = useReportStore();

  useEffect(() => {
    refresh();
  }, [refresh, selectedIndustry]);

  const baselineForIndustry =
    baselineByIndustry && selectedIndustry
      ? baselineByIndustry[selectedIndustry] ?? 0
      : baselineLiabilityUsd;
  const baselineM = baselineForIndustry / 1_000_000;
  const currentRiskM = Math.max(0, baselineM - totalMitigatedRiskM);

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

  const burnDownPercent = baselineM > 0 ? (currentRiskM / baselineM) * 100 : 0;

  const currencyMagnitude = useRiskStore((s) => s.currencyMagnitude);
  const liabilityExposureUsd = baselineForIndustry + acceptedM * 1e6 + pipelineM * 1e6;
  let adjustedLiabilityExposureUsd = liabilityExposureUsd;
  let adjustedBaselineUsd = baselineForIndustry;
  let adjustedCurrentUsd = currentRiskM * 1e6;
  let adjustedMitigatedUsd = totalMitigatedRiskM * 1e6;
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

          {/* Agent Efficiency */}
          <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Agent Efficiency</div>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-light text-amber-300">{agentEfficiencyCount}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                successful Sentinel Sweeps
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Each sweep represents a full Coreintel verification pass across the active asset surface.
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
                </tr>
              </thead>
              <tbody>
                {recentEvents.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-3 text-center text-[11px] text-slate-500 bg-slate-950/60"
                    >
                      No GRC audit events recorded yet.
                    </td>
                  </tr>
                )}
                {recentEvents.map((evt) => (
                  <tr key={evt.timestamp + evt.action}>
                    <td className="border-t border-slate-800 px-3 py-2 text-slate-300">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                    <td className="border-t border-slate-800 px-3 py-2 text-slate-300">{evt.userId}</td>
                    <td className="border-t border-slate-800 px-3 py-2 text-slate-300">{evt.action}</td>
                    <td className="border-t border-slate-800 px-3 py-2 text-rose-300">
                      {evt.justification ?? "—"}
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

