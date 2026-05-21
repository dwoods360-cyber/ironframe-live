"use client";

import type { ReadinessStatusState } from "@/lib/reporting/boardReportQueries";

type Props = {
  score: number;
  maxScore: number;
  band: string;
  readinessRating: string;
  statusState: ReadinessStatusState;
  targetReadinessScore: number;
  /** VIP material breach — Priority 1 pulse on gauge. */
  hasPriorityOneVipExposure: boolean;
};

/** Large radial gauge for operational readiness (SVG stroke-dasharray). */
export default function ReadinessGauge({
  score,
  maxScore,
  band,
  readinessRating,
  statusState,
  targetReadinessScore,
  hasPriorityOneVipExposure,
}: Props) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / maxScore));
  const offset = c * (1 - pct);
  const breached = statusState === "BREACHED";
  const priorityPulse = hasPriorityOneVipExposure;

  const stroke =
    breached || priorityPulse
      ? "#f87171"
      : score >= 90
        ? "#34d399"
        : score >= 75
          ? "#22c55e"
          : score >= 60
            ? "#eab308"
            : "#f87171";

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      {breached ? (
        <p className="max-w-xs text-center text-[10px] font-black uppercase leading-snug tracking-wide text-red-400">
          ⚠️ OPERATIONAL READINESS BELOW THRESHOLD
        </p>
      ) : null}
      {priorityPulse ? (
        <p className="max-w-xs text-center text-[9px] font-black uppercase tracking-wide text-red-500 motion-safe:animate-pulse">
          Priority 1 · VIP exposure active
        </p>
      ) : null}
      <div
        className={`relative rounded-full p-1 ${
          breached || priorityPulse
            ? `ring-4 ring-red-600 ring-offset-2 ring-offset-[#07070c] print:ring-offset-white ${
                priorityPulse ? "motion-safe:animate-pulse" : ""
              }`
            : ""
        }`}
      >
        <div className="relative h-40 w-40">
          <svg className="-rotate-90" viewBox="0 0 120 120" aria-hidden>
            <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(39,39,42,0.9)" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={stroke}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              className="motion-safe:transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className={`text-3xl font-black tabular-nums ${breached ? "text-red-200" : "text-zinc-100"}`}>
              {score}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">/{maxScore}</span>
          </div>
        </div>
      </div>
      <p className="text-center text-[9px] font-mono text-zinc-500">
        Target: <span className="text-zinc-300">{targetReadinessScore}</span> · Status:{" "}
        <span className={breached ? "font-black text-red-400" : "text-emerald-400/90"}>{statusState}</span>
      </p>
      <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{band}</p>
      <p className="max-w-xs text-center text-[9px] text-zinc-500">{readinessRating}</p>
    </div>
  );
}
