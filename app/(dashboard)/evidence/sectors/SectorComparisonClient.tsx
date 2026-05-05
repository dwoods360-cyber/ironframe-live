"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSectorRiskTemperature, type SectorRiskTemperatureRow } from "@/app/actions/benchmarkActions";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";

function formatWowPct(p: number | null): string {
  if (p == null || !Number.isFinite(p)) return "—";
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(1)}%`;
}

export default function SectorComparisonClient() {
  const [rows, setRows] = useState<SectorRiskTemperatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getSectorRiskTemperature();
    if (!res.ok) {
      setError(res.error);
      setRows([]);
    } else {
      setRows(res.rows);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-[min(100%,96rem)] px-4 py-4 text-slate-100 md:px-8">
      <header className="mb-5 border-b border-slate-800 pb-3">
        <h1 className="text-sm font-black uppercase tracking-widest text-cyan-300">Sector comparison</h1>
        <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-slate-400">
          Risk temperature across Ironethic benchmark industries. Compare WoW volatility to prioritize sector-specific
          control validation—for example when Healthcare is spiking but Finance is stable.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
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

      {error ? (
        <div className="mb-4 rounded border border-rose-800 bg-rose-950/35 px-3 py-2 text-[10px] text-rose-200">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded border border-slate-800">
        <table className="w-full min-w-[720px] border-collapse text-left text-[10px]">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-[9px] font-black uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2">Industry</th>
              <th className="px-3 py-2 text-right">Current mean ALE</th>
              <th className="px-3 py-2 text-right">WoW volatility</th>
              <th className="px-3 py-2">Market status</th>
              <th className="px-3 py-2">Signals</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  Loading sector benchmarks…
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.industry}
                  className={`border-b border-slate-800/80 hover:bg-slate-900/45 ${
                    r.highVolatilityUnderwriterAlert ? "bg-rose-950/20" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-semibold text-slate-100">{r.industry}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-200">
                    {formatCentsToUSD(r.currentMeanAleCents)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-300">{formatWowPct(r.wowVolatilityPct)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        r.marketStatus === "Volatile"
                          ? "text-rose-300"
                          : r.marketStatus === "Hardening"
                            ? "text-amber-300"
                            : "text-emerald-300"
                      }
                    >
                      {r.marketStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {r.highVolatilityUnderwriterAlert ? (
                      <span className="inline-flex rounded border border-rose-600/80 bg-rose-950/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-200">
                        High volatility — underwriter alert
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[9px] leading-relaxed text-slate-500">
        WoW uses the two most recent weekly snapshots per industry (same window as Strategic Intel). Volatile when WoW is
        above 20%; Hardening between 5% and 20%; Stable at 5% or below.
      </p>
    </div>
  );
}
