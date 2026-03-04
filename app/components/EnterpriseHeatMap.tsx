"use client";

import { useMemo } from "react";
import { useRiskStore, type PipelineThreat } from "@/app/store/riskStore";

const SCALE_MIN = 1;
const SCALE_MAX = 10;

type PlotPoint = {
  id: string;
  name: string;
  likelihood: number;
  impact: number;
  score: number;
  industry?: string;
  source?: string;
};

function getScore(likelihood: number, impact: number): number {
  return likelihood * impact;
}

function bubbleColor(score: number): string {
  if (score <= 25) return "bg-emerald-500/90 border-emerald-400";
  if (score <= 50) return "bg-amber-500/90 border-amber-400";
  if (score <= 75) return "bg-orange-500/90 border-orange-400";
  return "bg-rose-500/90 border-rose-400";
}

function toPoints(threats: PipelineThreat[]): PlotPoint[] {
  return threats.map((t) => {
    const likelihood = Math.min(SCALE_MAX, Math.max(SCALE_MIN, t.likelihood ?? 8));
    const impact = Math.min(SCALE_MAX, Math.max(SCALE_MIN, t.impact ?? 9));
    return {
      id: t.id,
      name: t.name,
      likelihood,
      impact,
      score: getScore(likelihood, impact),
      industry: t.industry,
      source: t.source,
    };
  });
}

export default function EnterpriseHeatMap() {
  const pipelineThreats = useRiskStore((s) => s.pipelineThreats);
  const activeThreats = useRiskStore((s) => s.activeThreats);

  const points = useMemo(() => {
    const all = [...pipelineThreats, ...activeThreats];
    return toPoints(all);
  }, [pipelineThreats, activeThreats]);

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        Likelihood (1–10) × Impact (1–10) — all active risks from pipeline + acknowledged
      </div>
      <div className="relative h-[380px] w-full min-w-[420px] rounded-lg border border-slate-700 bg-slate-950/60">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col">
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((yVal) => (
            <div key={yVal} className="flex flex-1 border-b border-slate-800/80">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((xVal) => (
                <div
                  key={xVal}
                  className="flex-1 border-r border-slate-800/60 last:border-r-0"
                  aria-hidden
                />
              ))}
            </div>
          ))}
        </div>
        {/* Axis labels */}
        <div className="absolute -bottom-5 left-0 right-0 flex justify-between px-1 text-[9px] font-bold text-slate-500">
          <span>1</span>
          <span>Likelihood →</span>
          <span>10</span>
        </div>
        <div className="absolute -left-8 top-0 flex h-full flex-col justify-between py-1 text-[9px] font-bold text-slate-500">
          <span>10</span>
          <span className="writing-mode-vertical">Impact</span>
          <span>1</span>
        </div>
        {/* Bubbles: position in % (X = likelihood, Y = impact with 10 at top) */}
        <div className="absolute inset-0 p-2">
          {points.map((p) => {
            const xPct = ((p.likelihood - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;
            const yPct = ((SCALE_MAX - p.impact) / (SCALE_MAX - SCALE_MIN)) * 100;
            const radius = Math.min(28, Math.max(12, 10 + p.score / 5));
            return (
              <div
                key={p.id}
                className={`absolute rounded-full border-2 ${bubbleColor(p.score)} shadow-lg transition-all duration-300 ease-out`}
                style={{
                  left: `calc(${xPct}% - ${radius}px)`,
                  top: `calc(${yPct}% - ${radius}px)`,
                  width: radius * 2,
                  height: radius * 2,
                }}
                title={`${p.name} — L:${p.likelihood} I:${p.impact} (${p.score})`}
              >
                <span className="absolute inset-0 flex items-center justify-center truncate px-1 text-[8px] font-bold text-white drop-shadow">
                  {p.name.length > 8 ? p.name.slice(0, 6) + "…" : p.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-[9px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Low (≤25)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Medium (26–50)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-orange-500" /> High (51–75)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500" /> Critical (76+)
        </span>
      </div>
    </div>
  );
}
