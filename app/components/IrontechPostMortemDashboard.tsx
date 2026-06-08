"use client";

import { useCallback, useEffect, useState } from "react";
import {
  downloadIrontechPostMortemPdfAction,
  getLatestIrontechPostMortemAction,
  type IrontechPostMortemDto,
} from "@/app/actions/irontechPostMortemActions";

type Props = {
  autoReveal?: boolean;
};

function statusTone(status: string): string {
  if (status === "OPTIMAL") return "text-emerald-300";
  if (status === "SUB_OPTIMAL") return "text-amber-300";
  return "text-rose-300";
}

export default function IrontechPostMortemDashboard({ autoReveal = true }: Props) {
  const [report, setReport] = useState<IrontechPostMortemDto | null>(null);
  const [loading, setLoading] = useState(autoReveal);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getLatestIrontechPostMortemAction();
      setReport(r);
      if (!r) setError("Post-mortem not generated yet.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoReveal) void load();
  }, [autoReveal, load]);

  const onDownload = () => {
    void (async () => {
      setDownloading(true);
      setDownloadMsg(null);
      const res = await downloadIrontechPostMortemPdfAction();
      setDownloading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const bin = atob(res.base64Pdf);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadMsg(`Signed PDF exported · seal ${res.reportSha256.slice(0, 12)}…`);
    })();
  };

  if (loading) {
    return (
      <p className="mt-6 text-[10px] uppercase tracking-widest text-cyan-400/80">
        Irontech post-mortem compiling…
      </p>
    );
  }

  if (!report) {
    return error ? (
      <p className="mt-6 text-[10px] text-zinc-500">{error}</p>
    ) : null;
  }

  return (
    <div className="mt-8 rounded-lg border border-cyan-700/40 bg-gradient-to-br from-slate-950 via-slate-950 to-cyan-950/30 p-5 shadow-[inset_0_1px_0_0_rgba(34,211,238,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-100">
            Irontech Post-Mortem
          </p>
          <p className="mt-1 text-[9px] text-slate-400">
            Agent 04 · {report.scenario} · {report.generatedAt.slice(0, 19)} UTC ·{" "}
            <span className="text-amber-200/90">[SIMULATION_DATA]</span>
          </p>
        </div>
        <button
          type="button"
          disabled={downloading}
          onClick={onDownload}
          className="rounded border border-cyan-500/70 bg-cyan-950/60 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-cyan-50 hover:bg-cyan-900/50 disabled:opacity-50"
        >
          {downloading ? "Signing PDF…" : "Download for Auditor"}
        </button>
      </div>

      {downloadMsg ? <p className="mt-2 text-[8px] text-emerald-300">{downloadMsg}</p> : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <MetricCard
          title="Containment speed"
          value={
            report.containment.containmentMs != null
              ? `${report.containment.containmentMs}ms`
              : "—"
          }
          sub={`Ironlock · ${report.containment.threatsFrozen} prod / ${report.containment.shadowFrozen} shadow frozen`}
        />
        <MetricCard
          title="Isolation integrity"
          value={report.isolation.integrityVerdict}
          sub={`${report.isolation.bleedIncidentCount} bleed signals · ${Math.round(report.isolation.observationWindowMs / 1000)}s window`}
        />
        <MetricCard
          title="Forensic quality (LWT)"
          value={report.forensicQuality.verdict}
          sub={`Min justification ${report.forensicQuality.minJustificationLength} / ${report.forensicQuality.requiredMinLength} chars`}
        />
      </div>

      {report.financialDefenseSummary ? (
        <div className="mt-4 rounded border border-emerald-800/50 bg-emerald-950/25 p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-200">
            Financial Defense Summary
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-[8px] uppercase text-slate-500">Governance dividend preserved</p>
              <p className="font-mono text-sm font-black text-emerald-300">
                {report.financialDefenseSummary.financialImpact.governanceDividendDisplay}
              </p>
            </div>
            <div>
              <p className="text-[8px] uppercase text-slate-500">Probabilistic liability</p>
              <p className="font-mono text-sm font-black text-rose-200">
                {report.financialDefenseSummary.financialImpact.probabilisticLiabilityDisplay}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[8px] leading-relaxed text-slate-300">
            {report.financialDefenseSummary.narrative}
          </p>
        </div>
      ) : null}

      {report.dmsLearning.failurePoint ? (
        <div className="mt-4 rounded border border-rose-800/60 bg-rose-950/30 p-3">
          <p className="text-[9px] font-black uppercase text-rose-200">Learning loop — DMS failure point</p>
          <p className="mt-1 text-[9px] text-rose-100/90">{report.dmsLearning.failurePoint}</p>
          {report.dmsLearning.residualFindings.length > 1 ? (
            <ul className="mt-2 list-inside list-disc text-[8px] text-rose-200/80">
              {report.dmsLearning.residualFindings.slice(1).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6">
        <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-cyan-200/90">
          Compliance Delta (Actual vs. TAS.md)
        </p>
        <div className="overflow-x-auto rounded border border-slate-800">
          <table className="w-full min-w-[32rem] text-left text-[8px]">
            <thead className="bg-slate-900/80 text-[7px] uppercase text-slate-500">
              <tr>
                <th className="px-2 py-1.5">Directive</th>
                <th className="px-2 py-1.5">TAS Ln</th>
                <th className="px-2 py-1.5">Expected</th>
                <th className="px-2 py-1.5">Actual</th>
                <th className="px-2 py-1.5">Delta</th>
                <th className="px-2 py-1.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.complianceDelta.map((row) => (
                <tr key={row.directiveId} className="border-t border-slate-800/80">
                  <td className="px-2 py-1.5 font-mono text-cyan-100">{row.directiveId}</td>
                  <td className="px-2 py-1.5 tabular-nums text-slate-400">{row.tasLineRef}</td>
                  <td className="px-2 py-1.5 text-slate-300">{row.expected}</td>
                  <td className="px-2 py-1.5 text-slate-200">{row.actual}</td>
                  <td className="px-2 py-1.5 text-slate-400">{row.delta}</td>
                  <td className={`px-2 py-1.5 font-bold uppercase ${statusTone(row.status)}`}>
                    {row.status.replace("_", "-")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[7px] text-slate-500">
          Example: TAS.md Directive 4 (Ln 119) isolation SLA — compare expected vs. measured containment.
        </p>
      </div>

      <p className="mt-4 font-mono text-[7px] text-slate-600">
        Report SHA-256 {report.reportSha256.slice(0, 24)}… · Seal {report.signedSeal.slice(0, 16)}…
      </p>
    </div>
  );
}

function MetricCard({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded border border-slate-800 bg-black/30 p-3">
      <p className="text-[8px] uppercase text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
      <p className="mt-1 text-[7px] leading-snug text-slate-400">{sub}</p>
    </div>
  );
}
