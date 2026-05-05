"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getIndustryBenchmarks } from "@/app/actions/benchmarkActions";
import { getFrameworkCoverage } from "@/app/actions/complianceActions";
import { triggerSentinelHunch } from "@/app/actions/sentinelActions";
import { useTenantContext } from "@/app/context/TenantProvider";
import { resolveDashboardTenantUuid } from "@/app/utils/clientTenantCookie";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";

type CoverageFramework = "SOC2" | "ISO27001" | "NIST";

type GapRow = {
  controlId: string;
  potentialAleExposureCents: string;
};

type CoveragePayload = {
  framework: CoverageFramework;
  readinessPercent: number;
  gaps: GapRow[];
  totals: { requiredControls: number; validatedControls: number; gapControls: number; potentialAleExposureCents: string };
};

function frameworkHintControl(framework: CoverageFramework): string {
  if (framework === "ISO27001") return "ISO27001 Annex A.8.2";
  if (framework === "NIST") return "NIST PR.AC-3";
  return "SOC2 CC6.1";
}

function symptomForAle(aleCents: string): "PERFORMANCE_DROP" | "INTEGRITY_ALERT" | "DATA_DRIFT" {
  try {
    const ale = BigInt(aleCents);
    if (ale >= 5_000_000n) return "INTEGRITY_ALERT";
    if (ale >= 1_000_000n) return "DATA_DRIFT";
    return "PERFORMANCE_DROP";
  } catch {
    return "PERFORMANCE_DROP";
  }
}

export default function GapsHealthCheckClient() {
  const { activeTenantUuid } = useTenantContext();
  const tenantUuid = useMemo(() => resolveDashboardTenantUuid(activeTenantUuid), [activeTenantUuid]);
  const [framework, setFramework] = useState<CoverageFramework>("SOC2");
  const [data, setData] = useState<CoveragePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyControl, setBusyControl] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [peerAlert, setPeerAlert] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantUuid) {
      setError("Tenant context required.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await getFrameworkCoverage(tenantUuid, framework);
    if (!res.ok) {
      setError(res.error);
      setData(null);
    } else {
      setData(res.coverage as CoveragePayload);
      const peer = await getIndustryBenchmarks(tenantUuid);
      if (peer.ok && res.coverage.readinessPercent < peer.payload.industryAvgPct) {
        const delta = Math.round((peer.payload.industryAvgPct - res.coverage.readinessPercent) * 100) / 100;
        const suggestedControl =
          res.coverage.gaps.find((g) => /A\.8\.2|PR\.AC-3|CC6\.1/i.test(g.controlId))?.controlId ??
          res.coverage.gaps[0]?.controlId ??
          "Encryption at Rest";
        setPeerAlert(
          `?? [PEER_ALERT] | Your '${suggestedControl}' validation is ${delta}% behind industry peers. Resolving this gap will improve your competitive standing for renewal.`,
        );
      } else {
        setPeerAlert(null);
      }
    }
    setLoading(false);
  }, [tenantUuid, framework]);

  useEffect(() => {
    void load();
  }, [load]);

  const triggerFix = useCallback(
    async (gap: GapRow) => {
      setBusyControl(gap.controlId);
      setFlash(null);
      const suggested = frameworkHintControl(framework);
      const targetAsset = `Control Stress Test :: ${gap.controlId}`;
      const call = await triggerSentinelHunch({
        targetAsset,
        observedSymptom: symptomForAle(gap.potentialAleExposureCents),
        confidenceLevel: 88,
        complianceFramework: framework,
      });
      setBusyControl(null);
      if (!call.ok) {
        setFlash(`Failed to trigger stress test for ${gap.controlId}: ${call.error}`);
        return;
      }
      setFlash(
        `Triggered 19-agent control validation for ${gap.controlId}. Sentinel case ${call.threatId.slice(0, 10)}… opened with ${suggested} baseline mapping.`
      );
      await load();
    },
    [framework, load],
  );

  return (
    <div className="mx-auto w-full max-w-[min(100%,96rem)] px-4 py-4 text-slate-100 md:px-8">
      <header className="mb-5 border-b border-slate-800 pb-3">
        <h1 className="text-sm font-black uppercase tracking-widest text-amber-300">Pre-Submission Audit</h1>
        <p className="mt-1 text-[11px] text-slate-400">
          Internal health check before carrier export. This view never leaves tenant scope and is excluded from external evidence packs.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded border border-slate-800 bg-slate-900/45 p-3">
        <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Framework
          <select
            value={framework}
            onChange={(e) => setFramework(e.target.value as CoverageFramework)}
            className="mt-1 block rounded border border-slate-600 bg-slate-950 px-2 py-2 text-[11px] text-slate-100"
          >
            <option value="SOC2">SOC2</option>
            <option value="ISO27001">ISO27001</option>
            <option value="NIST">NIST</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-200 hover:border-slate-400"
        >
          Refresh
        </button>
        <Link
          href="/evidence"
          className="rounded border border-cyan-700/60 bg-cyan-950/35 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-cyan-100 hover:border-cyan-500"
        >
          Back to evidence vault
        </Link>
      </div>

      {!loading && data && data.gaps.length > 0 ? (
        <div className="mb-4 rounded border border-rose-700/70 bg-rose-950/35 px-4 py-3 text-rose-100">
          <p className="text-[11px] font-black uppercase tracking-wide">DO NOT EXPORT: These {data.gaps.length} control gaps will negatively impact your premium discount.</p>
          <p className="mt-1 text-[10px] text-rose-200/90">
            Potential ALE exposed by unresolved controls: {formatCentsToUSD(data.totals.potentialAleExposureCents)}
          </p>
        </div>
      ) : null}

      {flash ? (
        <div className="mb-4 rounded border border-cyan-700/60 bg-cyan-950/35 px-3 py-2 text-[10px] text-cyan-100">{flash}</div>
      ) : null}
      {peerAlert ? (
        <div className="mb-4 rounded border border-violet-700/60 bg-violet-950/35 px-3 py-2 text-[10px] text-violet-100">
          {peerAlert}
        </div>
      ) : null}

      {error ? <div className="mb-4 rounded border border-rose-800 bg-rose-950/35 px-3 py-2 text-[10px] text-rose-200">{error}</div> : null}

      <div className="overflow-x-auto rounded border border-slate-800">
        <table className="w-full min-w-[700px] border-collapse text-left text-[10px]">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-[9px] font-black uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Gap control</th>
              <th className="px-3 py-2 text-right">Potential ALE exposure</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">Running internal health check…</td></tr>
            ) : !data || data.gaps.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-emerald-300">No framework gaps identified. Export posture is healthy.</td></tr>
            ) : (
              data.gaps.map((gap, idx) => (
                <tr key={gap.controlId} className="border-b border-slate-800/80 hover:bg-slate-900/45">
                  <td className="px-3 py-2 text-slate-300">#{idx + 1}</td>
                  <td className="px-3 py-2 font-mono text-slate-200">{gap.controlId}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-200">{formatCentsToUSD(gap.potentialAleExposureCents)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={busyControl === gap.controlId}
                      onClick={() => void triggerFix(gap)}
                      className="rounded border border-amber-700/70 bg-amber-950/40 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-amber-100 hover:border-amber-500 disabled:opacity-50"
                    >
                      {busyControl === gap.controlId ? "Triggering…" : "Trigger Control Stress Test"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
