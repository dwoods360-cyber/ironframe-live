"use client";

import type { BoardGovernanceRow } from "@/lib/reporting/boardReportQueries";

type Props = {
  rows: BoardGovernanceRow[];
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function GovernanceAuditList({ rows }: Props) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
      <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Governance · Last 5</h3>
      <p className="mt-1 text-[9px] text-zinc-600">Notification and lab restoration configuration audit trail.</p>
      <ul className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <li className="text-[9px] text-zinc-600">No matching audit rows.</li>
        ) : (
          rows.map((r) => (
            <li
              key={r.id}
              className="rounded border border-zinc-800/80 bg-zinc-900/40 px-2 py-1.5 text-[8px] leading-snug text-zinc-400"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-1">
                <span className="font-mono text-zinc-500">{fmt(r.createdAt)}</span>
                <span className="font-black uppercase tracking-wider text-teal-500/90">{r.action}</span>
              </div>
              <div className="mt-0.5 text-zinc-600">Operator: {r.operatorId}</div>
              {r.justification ? (
                <p className="mt-1 line-clamp-2 text-zinc-500">{r.justification}</p>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
