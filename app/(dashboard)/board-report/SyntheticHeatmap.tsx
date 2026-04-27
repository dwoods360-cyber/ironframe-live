"use client";

import type { SyntheticHeatRow } from "@/lib/reporting/boardReportQueries";
import { clearanceHeatmapCellClasses, clearanceLabel } from "@/app/utils/clearanceColors";

function usdShort(cents: string): string {
  try {
    const n = Number(BigInt(cents)) / 100;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
    return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  } catch {
    return "—";
  }
}

type Props = {
  rows: SyntheticHeatRow[];
};

export default function SyntheticHeatmap({ rows }: Props) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
      <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
        Synthetic persona heatmap
      </h3>
      <p className="mt-1 text-[9px] text-zinc-600">
        Cell color = clearance tier (Exec/Director/Manager/Standard). Secondary tag = velocity tier (HIGH / WATCH /
        LOW).
      </p>
      <div className="mt-3 grid max-h-[280px] grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
        {rows.map((r) => {
          const clearanceCls = clearanceHeatmapCellClasses(r.clearanceLevel);
          return (
            <div
              key={r.id}
              title={`${r.name} · ${r.role} · ${clearanceLabel(r.clearanceLevel)}\nValue ${usdShort(r.monetaryValueCents)} · Loss ${usdShort(r.totalLossIncurredCents)}`}
              className={`rounded border px-2 py-1.5 text-[8px] leading-tight ${clearanceCls}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="truncate font-semibold">{r.name}</span>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-0.5">
                  {r.vipProtectionCritical ? (
                    <span className="rounded border border-red-500/80 bg-red-950/60 px-1 py-px font-mono text-[5px] font-black uppercase leading-tight tracking-wide text-red-200">
                      VIP protection critical
                    </span>
                  ) : null}
                  <span className="rounded border border-white/10 px-0.5 font-mono text-[6px] uppercase text-white/70">
                    {clearanceLabel(r.clearanceLevel)}
                  </span>
                </div>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-1 font-mono text-[7px] opacity-90">
                <span>{usdShort(r.monetaryValueCents)}</span>
                <span className="uppercase tracking-tighter">{r.heatTier}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
