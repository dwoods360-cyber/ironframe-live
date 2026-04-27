"use client";

import type { BoardResilienceStreak } from "@/lib/reporting/boardReportQueries";

type Props = {
  streak: BoardResilienceStreak;
};

function fireTone(streakDays: number): string {
  if (streakDays >= 14) return "text-orange-400";
  if (streakDays >= 7) return "text-amber-400";
  if (streakDays >= 3) return "text-cyan-300";
  return "text-blue-400";
}

export default function ResilienceStreakCard({ streak }: Props) {
  const graceHours = streak.graceRemainingMinutes != null ? Math.floor(streak.graceRemainingMinutes / 60) : 0;
  const graceMinutes = streak.graceRemainingMinutes != null ? streak.graceRemainingMinutes % 60 : 0;
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 print:border-zinc-300 print:bg-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 print:text-zinc-600">
            Wall of Fame
          </h2>
          <p className="mt-1 text-[11px] text-zinc-400 print:text-zinc-700">
            Consecutive resilience-days at readiness score 95+.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {streak.shieldDepleting ? (
            <span className="rounded border border-amber-500/70 bg-amber-950/40 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-amber-200">
              SHIELD DEPLETING · {graceHours}h {graceMinutes}m
            </span>
          ) : streak.shieldActive ? (
            <span className="rounded border border-cyan-500/70 bg-cyan-950/40 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-200">
              SHIELD ACTIVE
            </span>
          ) : null}
          <span className={`text-2xl leading-none ${fireTone(streak.currentStreak)}`} aria-hidden>
            🔥
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <p className="text-xl font-black tabular-nums text-zinc-100 print:text-zinc-900">
          {streak.currentStreak} Days of Resilience
        </p>
        <p className="text-[11px] font-semibold text-zinc-400 print:text-zinc-700">
          All-Time Record:{" "}
          <span className="font-mono text-zinc-200 print:text-zinc-900">{streak.longestStreak}</span> Days
        </p>
      </div>
    </section>
  );
}
