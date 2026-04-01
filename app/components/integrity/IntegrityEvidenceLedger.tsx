"use client";

import { useMemo } from "react";
import type { ServerIntegrityLedgerRow } from "@/app/types/integrityLedger";

function formatControlType(badges: string[]): string {
  if (!badges.length) return "—";
  return badges
    .map((b) => (b === "SOC2" ? "SOC 2" : b === "ISO" ? "ISO" : b === "NIST" ? "NIST" : b))
    .join(" / ");
}

function formatBadgeLabel(b: string): string {
  if (b === "SOC2") return "SOC 2";
  if (b === "ISO") return "ISO";
  if (b === "NIST") return "NIST";
  return b;
}

/** Local wall-clock, second precision (auditor-readable). */
function formatLocalTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const sec = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}:${sec}`;
}

/** High-density ledger: first N chars + ellipsis for fixed-width hash column. */
function ellipsizeHash(hex: string | null, maxChars = 10): string {
  if (hex == null || hex === "") return "—";
  if (hex.length <= maxChars) return hex;
  return `${hex.slice(0, maxChars)}…`;
}

const cellTd =
  "max-w-0 overflow-hidden whitespace-nowrap px-2 py-1 text-left align-middle text-xs leading-tight";
const cellTh =
  "overflow-hidden whitespace-nowrap px-2 py-1.5 text-left align-bottom text-[10px] font-black uppercase tracking-wide text-slate-500";

type UnifiedRow = {
  /** Prisma `ThreatEvent.id` — stable list key for polling. */
  id: string;
  sortTime: number;
  timestampIso: string;
  timestampLocal: string;
  authorizedUserId: string;
  authorizedDisplayName: string;
  auditScenarioTitle: string;
  controlType: string;
  recoverySeconds: number | null;
  lkgHash: string | null;
  threatId: string;
  eventType: string;
  frameworkBadges: string[];
};

function ledgerAuthorizedDisplayLabel(userId: string, displayName: string): string {
  if (userId === "SYSTEM_IRONTECH_AUTO" && displayName === "SYSTEM_IRONTECH_AUTO") {
    return "Irontech (autonomous)";
  }
  return displayName;
}

function serverToUnified(s: ServerIntegrityLedgerRow): UnifiedRow {
  return {
    id: s.id,
    sortTime: new Date(s.timestampIso).getTime(),
    timestampIso: s.timestampIso,
    timestampLocal: formatLocalTimestamp(s.timestampIso),
    authorizedUserId: s.authorizedUserId,
    authorizedDisplayName: ledgerAuthorizedDisplayLabel(s.authorizedUserId, s.authorizedDisplayName),
    auditScenarioTitle: s.auditScenarioTitle,
    controlType: formatControlType(s.frameworkBadges),
    recoverySeconds: s.recoverySeconds,
    lkgHash: s.lkgAttestationIroncoreSha256,
    threatId: s.threatId,
    eventType: s.eventType,
    frameworkBadges: s.frameworkBadges,
  };
}

export default function IntegrityEvidenceLedger({
  serverRows = [],
  liveSyncActive = false,
  embeddedInForensicSection = false,
}: {
  serverRows?: ServerIntegrityLedgerRow[];
  /** When true, show auditor indicator (ledger rows are always server-sourced). */
  liveSyncActive?: boolean;
  /** Omit outer card chrome when nested under the forensic section (vault strip + ledger). */
  embeddedInForensicSection?: boolean;
}) {
  const recordCount = serverRows.length;

  const rows = useMemo((): UnifiedRow[] => {
    const list = serverRows.map(serverToUnified);
    list.sort((x, y) => y.sortTime - x.sortTime);
    return list;
  }, [serverRows]);

  const titleBlockMb = embeddedInForensicSection ? "mb-1.5" : "mb-2";

  const inner = (
    <>
      <div className={`${titleBlockMb} flex flex-wrap items-end justify-between gap-x-2 gap-y-1`}>
        <div className="min-w-0">
          <h2
            id="forensic-ledger-heading"
            className="text-xs font-black uppercase tracking-[0.15em] text-slate-200"
          >
            Forensic evidence ledger
          </h2>
          <p className="mt-0.5 line-clamp-1 text-[9px] text-slate-500">
            SOC 2 auditability: resolution timestamp and authorized identity from{" "}
            <span className="font-mono text-slate-500">ingestionDetails</span> (session, operator cookie, or{" "}
            <span className="text-slate-400">SYSTEM_IRONTECH_AUTO</span>).
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-x-2 gap-y-1">
          {liveSyncActive ? (
            <span
              className="flex items-center gap-2 rounded border border-emerald-800/60 bg-emerald-950/35 px-2.5 py-1 text-[8px] font-black uppercase tracking-wide text-emerald-300"
              title="Server data refreshes every 5 seconds"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#34d399]" />
              </span>
              LIVE SYNC ACTIVE
            </span>
          ) : null}
          <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-[9px] text-slate-400">
            {recordCount} record{recordCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="max-h-[min(72vh,calc(100vh-12rem))] overflow-x-auto overflow-y-auto rounded border border-slate-800/80">
        <table className="table-fixed w-full min-w-[1154px] border-collapse text-left text-slate-200">
          <colgroup>
            {(
              [
                { key: "col-timestamp", className: "w-[180px]" },
                { key: "col-authorized", className: "w-[150px]" },
                { key: "col-title", className: "w-[240px]" },
                { key: "col-control", className: "w-[100px]" },
                { key: "col-recv", className: "w-[64px]" },
                { key: "col-lkg", className: "w-[120px]" },
                { key: "col-threat", className: "w-[150px]" },
                { key: "col-event", className: "w-[150px]" },
              ] as const
            ).map((col) => (
              <col key={col.key} className={col.className} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-[1]">
            <tr className="border-b border-slate-800 bg-slate-900/95 shadow-sm backdrop-blur-sm">
              <th className={cellTh}>Timestamp</th>
              <th className={cellTh}>Authorized by</th>
              <th className={cellTh}>Title</th>
              <th className={cellTh}>Control</th>
              <th className={cellTh}>Recv</th>
              <th className={cellTh}>LKG SHA-256</th>
              <th className={cellTh}>Threat</th>
              <th className={cellTh}>Event</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-xs text-slate-500">
                  No resolved chaos drills in the database yet. Run a scenario on Main Ops until the card turns green,
                  then refresh — rows load from Prisma (<span className="font-mono">ThreatEvent.RESOLVED</span>).
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const authLine =
                  row.authorizedDisplayName === row.authorizedUserId
                    ? row.authorizedDisplayName
                    : `${row.authorizedDisplayName} · ${row.authorizedUserId}`;
                const eventLine = row.eventType;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-slate-800/70 hover:bg-white/5"
                  >
                    <td className={`${cellTd} font-mono text-slate-300`} title={row.timestampIso}>
                      {row.timestampLocal}
                    </td>
                    <td className={`${cellTd} font-medium text-slate-100`} title={authLine}>
                      <span className="block min-w-0 truncate">{authLine}</span>
                    </td>
                    <td className={`${cellTd} font-semibold text-slate-100`} title={row.auditScenarioTitle}>
                      <span className="block min-w-0 truncate">{row.auditScenarioTitle}</span>
                    </td>
                    <td className={`${cellTd} font-semibold text-teal-200/90`} title={row.controlType}>
                      {row.frameworkBadges.length === 0 ? (
                        <span className="block min-w-0 truncate">—</span>
                      ) : (
                        <span className="flex min-w-0 flex-wrap gap-1">
                          {row.frameworkBadges.map((b, fwIdx) => (
                            <span
                              key={`${row.id}-fw-${fwIdx}-${b}`}
                              className="inline-block max-w-full truncate rounded border border-teal-800/45 bg-teal-950/30 px-1 py-0.5 text-[9px] font-semibold text-teal-200/90"
                            >
                              {formatBadgeLabel(b)}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className={`${cellTd} font-mono text-emerald-300/90`}>
                      {row.recoverySeconds != null ? `${row.recoverySeconds.toFixed(1)}s` : "—"}
                    </td>
                    <td
                      className={`${cellTd} font-mono text-slate-300`}
                      title={row.lkgHash ?? undefined}
                    >
                      {ellipsizeHash(row.lkgHash, 10)}
                    </td>
                    <td className={`${cellTd} font-mono text-cyan-300/85`} title={row.threatId}>
                      <span className="block min-w-0 truncate">{row.threatId}</span>
                    </td>
                    <td className={`${cellTd} text-slate-400`} title={eventLine}>
                      <span className="block min-w-0 truncate">{eventLine}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  if (embeddedInForensicSection) {
    return (
      <div className="w-full px-4 pb-4 pt-2 md:px-5" aria-labelledby="forensic-ledger-heading">
        {inner}
      </div>
    );
  }

  return (
    <section
      className="w-full rounded-lg border border-slate-800 bg-slate-950/80 p-3 shadow-inner md:p-4"
      aria-labelledby="forensic-ledger-heading"
    >
      {inner}
    </section>
  );
}
