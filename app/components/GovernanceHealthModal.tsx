"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { GovernanceMaturitySnapshot, MaturityTrendPoint } from "@/app/types/governanceMaturity";
import { refreshGovernanceMaturityAction } from "@/app/actions/governanceMaturityActions";
import IrontallyGovernancePanel from "@/app/components/IrontallyGovernancePanel";
import type { IrontallyFrameworkSnapshot } from "@/app/services/irontallyMapper";
import type { CostOfNonComplianceResult } from "@/app/utils/financialRisk";

type Props = {
  snapshot: GovernanceMaturitySnapshot;
  trend: MaturityTrendPoint[];
  financialImpact?: CostOfNonComplianceResult;
  irontally?: IrontallyFrameworkSnapshot;
  onClose: () => void;
  onRefresh: () => void;
};

function barWidth(score: number): string {
  return `${Math.min(100, Math.max(8, (score / 10) * 100))}%`;
}

export default function GovernanceHealthModal({
  snapshot,
  trend,
  financialImpact,
  irontally,
  onClose,
  onRefresh,
}: Props) {
  const [busy, setBusy] = useState(false);

  const onRecalc = () => {
    void (async () => {
      setBusy(true);
      await refreshGovernanceMaturityAction();
      setBusy(false);
      onRefresh();
    })();
  };

  const rows = [
    {
      label: "Attestation quality",
      weight: `${(snapshot.weights.attestation * 100).toFixed(0)}%`,
      score: snapshot.components.attestationQuality,
      detail: `Last ${snapshot.sampleSizes.resolutionsSampled} resolutions (forensic score average)`,
    },
    {
      label: "Chaos resilience",
      weight: `${(snapshot.weights.chaos * 100).toFixed(0)}%`,
      score: snapshot.components.chaosResilience,
      detail: snapshot.sampleSizes.chaosReportAvailable
        ? "Latest Constitutional Collapse post-mortem (DMS / LWT / isolation)"
        : "No collapse post-mortem — baseline applied",
    },
    {
      label: "Directivity",
      weight: `${(snapshot.weights.directivity * 100).toFixed(0)}%`,
      score: snapshot.components.directivity,
      detail: "Resolutions citing TAS.md deep-links (/constitution/tas, anchors)",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="governance-health-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-cyan-700/50 bg-slate-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="governance-health-title" className="text-sm font-black uppercase tracking-widest text-cyan-100">
              Governance Health
            </h2>
            <p className="mt-1 font-mono text-2xl font-black tabular-nums text-white">
              {snapshot.score.toFixed(1)}
              <span className="text-sm text-slate-500"> /10</span>
            </p>
            {snapshot.apiOutagePenaltyActive ? (
              <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-amber-300">
                Degraded (API Outage)
                {snapshot.apiOutagePenaltyPoints != null
                  ? ` · Ironwatch −${snapshot.apiOutagePenaltyPoints.toFixed(1)}`
                  : ""}
              </p>
            ) : null}
            <p className="mt-1 text-[9px] text-slate-400">
              Calculated {new Date(snapshot.calculatedAt).toLocaleString()}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded border border-slate-700 p-1 text-slate-400 hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {snapshot.governanceDegradationActive ? (
          <p className="mt-3 rounded border border-rose-800/60 bg-rose-950/40 px-3 py-2 text-[9px] text-rose-200">
            [GOVERNANCE_DEGRADATION] Active — Neutralize requires {snapshot.neutralizeMinChars} characters until score recovers to 5.0.
          </p>
        ) : null}
        {snapshot.apiOutagePenaltyActive ? (
          <p className="mt-3 rounded border border-amber-800/60 bg-amber-950/40 px-3 py-2 text-[9px] text-amber-100">
            [IRONLOCK · STALE DATA] Forensic justification minimum is {snapshot.neutralizeMinChars} characters while the live
            sustainability API is unavailable (Ironwatch). Normal floor is 50; this window enforces additional human scrutiny.
          </p>
        ) : null}
        {financialImpact ? (
          <div className="mt-4 rounded border border-emerald-800/50 bg-emerald-950/20 p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-200/90">
              Financial impact (CoNC)
            </p>
            <p className="mt-1 text-[8px] text-slate-400">
              Baseline {financialImpact.totalBaselineDisplay}
              {financialImpact.baselineMode === "governance_envelope"
                ? " · $1.6B governance envelope"
                : " · tenant constitutional ALE"}
              {" · "}
              {(financialImpact.liabilityRatio * 100).toFixed(0)}% liability ratio
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-[8px] uppercase text-slate-500">Probabilistic liability</p>
                <p className="font-mono text-sm font-black tabular-nums text-rose-200">
                  {financialImpact.probabilisticLiabilityDisplay}
                </p>
              </div>
              <div>
                <p className="text-[8px] uppercase text-slate-500">Governance dividend</p>
                <p className="font-mono text-sm font-black tabular-nums text-emerald-300">
                  {financialImpact.governanceDividendDisplay}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[7px] text-slate-500">
              Sustainability ALE (Ironbloom): {financialImpact.sustainabilityAleDisplay} · Carbon penalty
              avoided: {financialImpact.carbonPenaltyAvoidedDisplay}
            </p>
            <p className="mt-1 text-[7px] font-semibold text-emerald-300/90">
              Combined dividend (governance + sustainability):{" "}
              {financialImpact.combinedGovernanceDividendDisplay}
            </p>
            <p className="mt-2 text-[7px] text-slate-500">
              Max exposure at score 1: {financialImpact.maxExposureDisplay}. Maturity discount{" "}
              {(financialImpact.maturityDiscountFactor * 100).toFixed(1)}% at current score.
            </p>
          </div>
        ) : null}
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <GovernanceHealthRow key={row.label} row={row} barWidth={barWidth} />
          ))}
        </div>
        {trend.length > 0 ? (
          <div className="mt-5 border-t border-slate-800 pt-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">30-day maturity trend</p>
            <div className="mt-2 flex h-16 items-end gap-0.5">
              {trend.map((p) => (
                <div
                  key={p.date}
                  className="min-w-[4px] flex-1 rounded-t bg-cyan-600/70"
                  style={{ height: barWidth(p.score) }}
                  title={`${p.date}: ${p.score.toFixed(1)}`}
                />
              ))}
            </div>
          </div>
        ) : null}
        {snapshot.notes?.length ? (
          <ul className="mt-4 list-inside list-disc text-[8px] text-slate-500">
            {snapshot.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        ) : null}
        {irontally ? <IrontallyGovernancePanel snapshot={irontally} /> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onRecalc}
            className="rounded border border-cyan-600/60 px-3 py-1.5 text-[9px] font-bold uppercase text-cyan-100 disabled:opacity-50"
          >
            {busy ? "Recalculating…" : "Recalculate"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-600 px-3 py-1.5 text-[9px] font-bold uppercase text-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function GovernanceHealthRow({
  row,
  barWidth,
}: {
  row: { label: string; weight: string; score: number; detail: string };
  barWidth: (score: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between text-[9px]">
        <span className="font-bold uppercase text-slate-300">
          {row.label} <span className="text-slate-500">({row.weight})</span>
        </span>
        <span className="font-mono tabular-nums text-cyan-200">{row.score.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-cyan-500/80" style={{ width: barWidth(row.score) }} />
      </div>
      <p className="mt-1 text-[8px] text-slate-500">{row.detail}</p>
    </div>
  );
}
