"use client";

import type { BoardInsuranceProjection } from "@/lib/reporting/boardReportQueries";

type Props = {
  projection: BoardInsuranceProjection;
};

function usdFromCentsString(cents: string): string {
  try {
    const n = Number(BigInt(cents)) / 100;
    return n.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  } catch {
    return "—";
  }
}

function trendGlyph(direction: BoardInsuranceProjection["premiumTrendDirection"]): string {
  if (direction === "UP") return "▲";
  if (direction === "DOWN") return "▼";
  return "•";
}

export default function CyberInsuranceProjectionCard({ projection }: Props) {
  const trendColor =
    projection.premiumTrendDirection === "UP"
      ? "text-rose-300"
      : projection.premiumTrendDirection === "DOWN"
        ? "text-emerald-300"
        : "text-zinc-400";
  const totalProjectedLoss =
    (() => {
      try {
        return BigInt(projection.totalProjectedLossCents);
      } catch {
        return 0n;
      }
    })();
  const outOfPocket =
    (() => {
      try {
        return BigInt(projection.outOfPocketExposureCents);
      } catch {
        return 0n;
      }
    })();
  const insuranceCovered =
    (() => {
      try {
        return BigInt(projection.insuranceCoveredCents);
      } catch {
        return 0n;
      }
    })();
  const redPct =
    totalProjectedLoss > 0n
      ? Math.max(0, Math.min(100, Math.round((Number(outOfPocket) / Number(totalProjectedLoss)) * 100)))
      : 0;
  const greenPct =
    totalProjectedLoss > 0n
      ? Math.max(0, Math.min(100, Math.round((Number(insuranceCovered) / Number(totalProjectedLoss)) * 100)))
      : 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 print:border-zinc-300 print:bg-white">
      <h2 className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 print:text-zinc-600">
        Cyber insurance projection
      </h2>
      <p className="text-2xl font-black tabular-nums text-zinc-100 print:text-zinc-900">
        {usdFromCentsString(projection.currentPremiumCents)}
      </p>
      <p className="mt-1 text-[9px] text-zinc-600 print:text-zinc-700">Current Premium</p>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-800/70 pt-2 text-[10px]">
        <span className="text-zinc-500 print:text-zinc-700">Potential savings (remaining VIP hardening)</span>
        <span className="font-mono font-semibold text-emerald-300 print:text-emerald-800">
          {usdFromCentsString(projection.potentialSavingsCents)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
        <span className="text-zinc-500 print:text-zinc-700">Trend vs last Daily Snapshot</span>
        <span className={`font-mono ${trendColor}`}>
          {trendGlyph(projection.premiumTrendDirection)} {projection.premiumTrendDirection}
        </span>
      </div>
      <div className="mt-3 border-t border-zinc-800/70 pt-2">
        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500 print:text-zinc-700">
          Retention & deductible
        </p>
        <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
          <span className="text-zinc-500 print:text-zinc-700">
            Policy Deductible (paid before insurance)
          </span>
          <span className="font-mono font-semibold text-rose-300 print:text-rose-800">
            {usdFromCentsString(projection.policyDeductibleCents)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
          <span className="text-zinc-500 print:text-zinc-700">Net Liability (Projected Loss - Deductible)</span>
          <span className="font-mono font-semibold text-zinc-200 print:text-zinc-900">
            {usdFromCentsString(projection.netLiabilityCents)}
          </span>
        </div>
        <div className="mt-2 overflow-hidden rounded border border-zinc-800 bg-zinc-900/70">
          <div className="flex h-3 w-full">
            <div
              className="bg-rose-500/80"
              style={{ width: `${redPct}%` }}
              title={`Company retained: ${usdFromCentsString(projection.outOfPocketExposureCents)}`}
            />
            <div
              className="bg-emerald-500/80"
              style={{ width: `${greenPct}%` }}
              title={`Insurance covered: ${usdFromCentsString(projection.insuranceCoveredCents)}`}
            />
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[9px] text-zinc-500 print:text-zinc-700">
          <span>
            Company (Red): {usdFromCentsString(projection.outOfPocketExposureCents)}
          </span>
          <span>
            Insurance (Green): {usdFromCentsString(projection.insuranceCoveredCents)}
          </span>
        </div>
      </div>
    </div>
  );
}
