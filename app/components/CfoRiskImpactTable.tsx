"use client";

import type { RiskImpactReport } from "@/app/lib/riskImpactReport";

type Props = {
  report: RiskImpactReport;
  acknowledged: boolean;
  onAcknowledge: () => void;
  acknowledgeBusy?: boolean;
};

export default function CfoRiskImpactTable({
  report,
  acknowledged,
  onAcknowledge,
  acknowledgeBusy = false,
}: Props) {
  return (
    <div className="mt-4 rounded border border-cyan-700/50 bg-cyan-950/25 p-3">
      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-cyan-200">
        CFO Financial Risk Audit — 3-Key → 2-Key ({report.multiplier}× redundancy loss)
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px] text-slate-200">
          <thead>
            <tr className="border-b border-slate-700 text-left uppercase tracking-wide text-slate-400">
              <th className="py-1 pr-2">Asset</th>
              <th className="py-1 pr-2">Current ALE</th>
              <th className="py-1 pr-2">New ALE (Post-Downgrade)</th>
              <th className="py-1">Risk Increase</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.assetKey} className="border-b border-slate-800/80">
                <td className="py-1.5 pr-2 font-semibold text-slate-100">{row.asset}</td>
                <td className="py-1.5 pr-2 tabular-nums">{row.currentAleDisplay}</td>
                <td className="py-1.5 pr-2 tabular-nums text-amber-200">{row.newAleDisplay}</td>
                <td className="py-1.5 tabular-nums text-rose-300">{row.increaseDisplay}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[9px] text-slate-400">
        Aggregate exposure delta:{" "}
        <span className="font-bold text-rose-300">{report.totalIncreaseDisplay}</span>
      </p>
      <button
        type="button"
        disabled={acknowledged || acknowledgeBusy}
        onClick={onAcknowledge}
        className="mt-3 w-full rounded border border-cyan-500/70 bg-cyan-900/40 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {acknowledged
          ? "Financial Risk Acknowledged"
          : acknowledgeBusy
            ? "Recording…"
            : "Acknowledge Financial Risk"}
      </button>
    </div>
  );
}
