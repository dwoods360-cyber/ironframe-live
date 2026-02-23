/**
 * IRONFRAME STANDARD: Top-level aggregate scoring and financial exposure readout.
 */

import Link from "next/link";
import HealthScoreBadge from "@/app/components/HealthScoreBadge";
import type { EntityData } from "@/app/utils/scoring";

export interface GlobalHealthSummaryCardProps {
  aggregateEntityData: EntityData;
  activeViolations: number;
  potentialRevenueImpact: number;
  coreintelTrendActive: boolean;
}

export default function GlobalHealthSummaryCard({
  aggregateEntityData,
  activeViolations,
  potentialRevenueImpact,
  coreintelTrendActive,
}: GlobalHealthSummaryCardProps) {
  return (
    <div className="border-b border-slate-800 bg-slate-950 p-4">
      <div className="group relative flex min-h-44 flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-6 transition-all hover:border-blue-500/60">
        <Link href="/vendors" aria-label="Open Global Vendor Intelligence" className="absolute inset-0 z-10" />
        <p className="text-[10px] font-bold uppercase tracking-wide text-white">SUPPLY CHAIN HEALTH</p>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">GLOBAL RATING</p>
          <HealthScoreBadge
            entityData={aggregateEntityData}
            scoreClassName="text-5xl [text-shadow:0_0_16px_rgba(16,185,129,0.35)]"
          />
        </div>

        <div className="flex justify-end">
          <div className="flex flex-col items-end gap-1.5">
            <span className="rounded border border-red-500 bg-red-500/20 px-2 py-1 text-[9px] font-bold uppercase text-red-500 animate-pulse">
              {activeViolations} ACTIVE VIOLATION{activeViolations === 1 ? "" : "S"}
            </span>
            <Link
              href="/vendors/portal"
              className="relative z-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-bold uppercase text-slate-200 hover:border-blue-500 hover:text-blue-300"
            >
              Open Vendor Portal
            </Link>
            <span className="rounded border border-blue-500/60 bg-blue-500/15 px-2 py-1 text-[9px] font-bold uppercase text-blue-300">
              POTENTIAL REVENUE IMPACT: ${potentialRevenueImpact.toLocaleString()}
            </span>
            {coreintelTrendActive && (
              <span className="rounded border border-amber-500/70 bg-amber-500/10 px-2 py-1 text-[9px] font-bold uppercase text-amber-300">
                COREINTEL ADJUSTMENT: MEDSHIELD AT-RISK REVENUE +15%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

