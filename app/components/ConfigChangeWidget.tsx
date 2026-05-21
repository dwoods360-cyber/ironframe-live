"use client";

import { useEffect, useState } from "react";
import { fetchRecentNotificationConfigEdits } from "@/app/actions/notificationAuditActions";
import type { NotificationConfigAuditRow } from "@/app/utils/notificationAuditSummary";

type Props = {
  /** Bump when registry or global toggle changes so the widget refetches. */
  refreshSignal?: string | number;
  className?: string;
};

function formatShort(iso: string): string {
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

/**
 * Phase 2 Board Report placeholder: recent notification / webhook configuration edits.
 */
export default function ConfigChangeWidget({ refreshSignal = 0, className = "" }: Props) {
  const [rows, setRows] = useState<NotificationConfigAuditRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setErr(null);
    void fetchRecentNotificationConfigEdits(3).then(
      (list) => {
        if (!cancelled) setRows(list);
      },
      (e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Load failed");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  const heights = [40, 56, 32];
  const maxH = Math.max(...heights, 1);

  return (
    <div
      className={`rounded-sm border border-zinc-800/80 bg-zinc-950/40 px-2 py-1.5 ${className}`}
      aria-label="Recent notification configuration changes"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[7px] font-black uppercase tracking-[0.18em] text-zinc-500">
          Board prep · Config churn
        </span>
        <span className="text-[7px] text-zinc-600">Last 3</span>
      </div>
      <div className="mt-1 flex items-end gap-1" style={{ height: maxH + 4 }}>
        {heights.map((h, i) => (
          <div
            key={i}
            className="w-1.5 rounded-t bg-emerald-900/50"
            style={{ height: `${h}px`, opacity: 0.35 + i * 0.2 }}
            aria-hidden
          />
        ))}
      </div>
      {err ? (
        <p className="mt-1 text-[8px] text-rose-400/90">{err}</p>
      ) : rows.length === 0 ? (
        <p className="mt-1 text-[8px] text-zinc-600">No configuration audit rows yet.</p>
      ) : (
        <ul className="mt-1 space-y-1 border-t border-zinc-800/60 pt-1">
          {rows.map((r) => (
            <li key={r.id} className="text-[8px] leading-snug text-zinc-400">
              <span className="font-mono text-zinc-500">{formatShort(r.createdAt)}</span>{" "}
              <span className="text-zinc-300">{r.action}</span>{" "}
              <span className="text-zinc-600">· {r.operatorId}</span>
              {r.justification ? (
                <span className="mt-0.5 line-clamp-2 block text-zinc-500">{r.justification}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
