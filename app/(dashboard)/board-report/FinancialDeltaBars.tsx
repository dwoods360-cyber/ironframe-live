"use client";

import type { BoardFinancialBlock } from "@/lib/reporting/boardReportQueries";

function usdFromCentsString(cents: string): string {
  try {
    const n = Number(BigInt(cents)) / 100;
    return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  } catch {
    return "—";
  }
}

type Props = {
  financial: BoardFinancialBlock;
};

/** Before vs after remediation narrative using synthetic exposure vs residual book. */
export default function FinancialDeltaBars({ financial }: Props) {
  const before = BigInt(financial.exposureBeforeCents);
  const after = BigInt(financial.exposureAfterCents);
  const max = before > after ? before : after > 0n ? after : 1n;
  const beforePct = Number((before * 100n) / max);
  const afterPct = Number((after * 100n) / max);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
      <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
        Financial delta · Exposure vs residual book
      </h3>
      <p className="mt-1 text-[9px] text-zinc-600">
        Before: aggregate synthetic access value. After: sum of max(0, access value minus simulated loss) per
        persona (Tier-3 shadow economics).
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
            <span>Exposure (at risk)</span>
            <span className="font-mono text-zinc-300">{usdFromCentsString(financial.exposureBeforeCents)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded bg-zinc-900">
            <div
              className="h-full rounded bg-amber-600/80"
              style={{ width: `${Math.min(100, beforePct)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
            <span>Residual book (post-loss)</span>
            <span className="font-mono text-emerald-300/90">{usdFromCentsString(financial.exposureAfterCents)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded bg-zinc-900">
            <div
              className="h-full rounded bg-emerald-600/75"
              style={{ width: `${Math.min(100, afterPct)}%` }}
            />
          </div>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-800/80 pt-3 text-[9px] text-zinc-500">
        <div>
          <dt className="font-black uppercase tracking-wider text-zinc-600">SIM bleed (30d)</dt>
          <dd className="font-mono text-zinc-300">{usdFromCentsString(financial.simulatedBleed30dCents)}</dd>
        </div>
        <div>
          <dt className="font-black uppercase tracking-wider text-zinc-600">Recovery rate</dt>
          <dd className="font-mono text-zinc-200">{financial.recoveryRatePercent}%</dd>
        </div>
        <div>
          <dt className="font-black uppercase tracking-wider text-zinc-600">SIM_LOSS events (30d)</dt>
          <dd className="font-mono text-zinc-300">{financial.simLossEventCount30d}</dd>
        </div>
        <div>
          <dt className="font-black uppercase tracking-wider text-zinc-600">Remediated tags (30d)</dt>
          <dd className="font-mono text-zinc-300">{financial.remediatedThreatCount30d}</dd>
        </div>
      </dl>
    </div>
  );
}
