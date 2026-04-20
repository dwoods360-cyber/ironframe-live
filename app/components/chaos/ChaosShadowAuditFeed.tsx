"use client";

import { useEffect, useRef } from "react";

export type ChaosShadowAuditEntry = { at: string; line: string; tone?: string };

export type ChaosAssigneeHandoffEntry = {
  at: string;
  phase: string;
  assigneeId: string;
  assigneeLabel: string;
  directiveId: string;
};

/** True when this row is an Irontech chaos drill (shadow plane telemetry in JSON). */
export function isChaosShadowPlaneThreat(ingestionDetails?: string | null): boolean {
  const raw = (ingestionDetails ?? "").trim();
  if (!raw) return false;
  try {
    const o = JSON.parse(raw) as { isChaosTest?: unknown };
    return o.isChaosTest === true;
  } catch {
    return false;
  }
}

export function parseChaosShadowAuditLog(ingestionDetails?: string | null): ChaosShadowAuditEntry[] {
  const raw = (ingestionDetails ?? "").trim();
  if (!raw) return [];
  try {
    const o = JSON.parse(raw) as { chaosShadowAuditLog?: unknown; isChaosTest?: unknown };
    if (o.isChaosTest !== true) return [];
    const log = o.chaosShadowAuditLog;
    if (!Array.isArray(log)) return [];
    return log
      .map((e) => {
        if (!e || typeof e !== "object") return null;
        const at = typeof (e as { at?: unknown }).at === "string" ? (e as { at: string }).at : "";
        const line = typeof (e as { line?: unknown }).line === "string" ? (e as { line: string }).line : "";
        const tone =
          typeof (e as { tone?: unknown }).tone === "string" ? (e as { tone: string }).tone : undefined;
        if (!line.trim()) return null;
        return { at: at || new Date().toISOString(), line, tone };
      })
      .filter(Boolean) as ChaosShadowAuditEntry[];
  } catch {
    return [];
  }
}

export function parseChaosAssigneeHandoffHistory(
  ingestionDetails?: string | null,
): ChaosAssigneeHandoffEntry[] {
  const raw = (ingestionDetails ?? "").trim();
  if (!raw) return [];
  try {
    const o = JSON.parse(raw) as { chaosAssigneeHandoffHistory?: unknown; isChaosTest?: unknown };
    if (o.isChaosTest !== true) return [];
    const log = o.chaosAssigneeHandoffHistory;
    if (!Array.isArray(log)) return [];
    return log
      .map((e) => {
        if (!e || typeof e !== "object") return null;
        const x = e as Record<string, unknown>;
        const at = typeof x.at === "string" ? x.at : "";
        const phase = typeof x.phase === "string" ? x.phase : "";
        const assigneeId = typeof x.assigneeId === "string" ? x.assigneeId : "";
        const assigneeLabel = typeof x.assigneeLabel === "string" ? x.assigneeLabel : "";
        const directiveId = typeof x.directiveId === "string" ? x.directiveId : "";
        if (!phase || !assigneeId) return null;
        return { at: at || new Date().toISOString(), phase, assigneeId, assigneeLabel, directiveId };
      })
      .filter(Boolean) as ChaosAssigneeHandoffEntry[];
  } catch {
    return [];
  }
}

type Props = {
  ingestionDetails?: string | null;
  pendingStatusLine?: string | null;
  className?: string;
};

function lineTextClass(line: string, tone?: string): string {
  if (tone === "white") return "font-semibold text-[#ffffff]";
  return "font-medium text-[#ffb000]";
}

/**
 * Classic terminal: amber / white monospace on near-black; optional handoff strip (GRC).
 */
export default function ChaosShadowAuditFeed({
  ingestionDetails,
  pendingStatusLine,
  className = "",
}: Props) {
  const entries = parseChaosShadowAuditLog(ingestionDetails);
  const handoffs = parseChaosAssigneeHandoffHistory(ingestionDetails);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [entries.length, handoffs.length, pendingStatusLine]);

  if (entries.length === 0 && handoffs.length === 0 && !(pendingStatusLine?.trim())) {
    return null;
  }

  return (
    <div
      role="log"
      aria-label="Irontech shadow audit terminal"
      className={`rounded-sm border border-zinc-800 bg-[#0a0a0a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ${className}`}
    >
      <div className="max-h-48 overflow-y-auto px-2.5 py-2 font-mono text-[10px] leading-relaxed">
        {entries.map((e, i) => (
          <div
            key={`${e.at}-${i}`}
            className="whitespace-pre-wrap break-words border-b border-zinc-800/80 py-1 last:border-0"
          >
            <span className="text-zinc-600">{e.at ? `${e.at} ` : ""}</span>
            <span className={lineTextClass(e.line, e.tone)}>{e.line}</span>
          </div>
        ))}
        {handoffs.length > 0 ? (
          <div className="mt-2 border-t border-zinc-800/90 pt-2 text-[9px] text-zinc-500">
            {handoffs.map((h, i) => (
              <div key={`${h.at}-${h.phase}-${i}`} className="py-0.5">
                <span className="text-zinc-600">{h.at} </span>
                <span className="text-zinc-400">
                  {h.assigneeLabel || h.assigneeId} · {h.directiveId}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        {pendingStatusLine?.trim() ? (
          <div className="mt-1 animate-pulse font-mono text-[10px] font-medium text-[#ffb000]">
            {pendingStatusLine.trim()}
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
