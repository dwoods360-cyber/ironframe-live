"use client";

import { useMemo, useState, useTransition } from "react";
import {
  generateSignedExport,
  verifyExportManifest,
  type IntegrityLedgerRow,
  type MetaAuditExportBundle,
} from "@/app/actions/auditActions";

type Props = {
  tenantId: string;
  canAccess: boolean;
  /** Full `/audit` page passes rows from RSC; omit or set `showIntegrityLedger={false}` in compact embeds. */
  integrityLedger?: IntegrityLedgerRow[];
  showIntegrityLedger?: boolean;
};

function toDateInputValue(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function downloadJson(fileName: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function shortHash(hex: string, head = 10, tail = 6): string {
  const t = hex.trim();
  if (t.length <= head + tail + 1) return t;
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}

export default function MetaAuditConsole({
  tenantId,
  canAccess,
  integrityLedger = [],
  showIntegrityLedger = true,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [periodStart, setPeriodStart] = useState(() => toDateInputValue(new Date(Date.now() - 7 * 86400000)));
  const [periodEnd, setPeriodEnd] = useState(() => toDateInputValue(new Date()));
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const disabled = useMemo(() => !canAccess || isPending, [canAccess, isPending]);

  async function handleGenerateExport() {
    setStatusMessage(null);
    startTransition(async () => {
      const startIso = new Date(`${periodStart}T00:00:00.000Z`).toISOString();
      const endIso = new Date(`${periodEnd}T23:59:59.999Z`).toISOString();
      const res = await generateSignedExport(tenantId, startIso, endIso);
      if (!res.ok) {
        setStatusMessage(res.error);
        return;
      }
      const file = `meta-audit-export-${periodStart}_to_${periodEnd}.json`;
      downloadJson(file, res.bundle);
      setStatusMessage(`Export generated: ${res.bundle.exportId}`);
    });
  }

  function parseAndVerify(file: File) {
    setVerifyMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      startTransition(async () => {
        try {
          const parsed = JSON.parse(String(reader.result)) as MetaAuditExportBundle;
          const verification = await verifyExportManifest(parsed);
          setVerifyMessage(verification.message);
        } catch (error) {
          setVerifyMessage(error instanceof Error ? error.message : "Invalid JSON payload.");
        }
      });
    };
    reader.onerror = () => setVerifyMessage("Failed to read file.");
    reader.readAsText(file);
  }

  if (!canAccess) {
    return (
      <div className="rounded border border-zinc-800/80 bg-zinc-950/60 p-3">
        <p className="text-[10px] text-zinc-500">
          Meta-Audit Console requires one of: Internal Auditor, External Auditor, Global Administrator, CISO, Director
          of Compliance, or GRC Manager (see server RBAC).
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
    <section className="rounded border border-zinc-800/85 bg-zinc-950/60 p-3">
      <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-200">Meta-Audit Console</h3>
      <p className="mt-1 text-[9px] text-zinc-500">
        Generate deterministic signed JSON manifests and verify historical exports.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-[9px] text-zinc-400">
          Period Start
          <input
            type="date"
            value={periodStart}
            disabled={disabled}
            onChange={(e) => setPeriodStart(e.currentTarget.value)}
            className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-200"
          />
        </label>
        <label className="text-[9px] text-zinc-400">
          Period End
          <input
            type="date"
            value={periodEnd}
            disabled={disabled}
            onChange={(e) => setPeriodEnd(e.currentTarget.value)}
            className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-200"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => void handleGenerateExport()}
        className="mt-3 rounded border border-cyan-700/70 bg-cyan-950/25 px-2 py-1.5 text-[9px] font-black uppercase tracking-wide text-cyan-100 disabled:opacity-50"
      >
        {isPending ? "Generating..." : "Generate & Download Export"}
      </button>
      {statusMessage ? <p className="mt-2 text-[9px] text-zinc-300">{statusMessage}</p> : null}

      <div
        className={`mt-4 rounded border border-dashed p-3 text-center transition-colors ${
          dragActive ? "border-emerald-500/70 bg-emerald-950/20" : "border-zinc-700 bg-zinc-900/40"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) parseAndVerify(file);
        }}
      >
        <p className="text-[9px] text-zinc-400">Drop a previously exported `.json` file to verify integrity</p>
        <label className="mt-2 inline-block cursor-pointer rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-[9px] text-zinc-300">
          Select JSON
          <input
            type="file"
            accept=".json,application/json"
            disabled={isPending}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) parseAndVerify(file);
            }}
            className="hidden"
          />
        </label>
      </div>

      {verifyMessage ? <p className="mt-2 text-[9px] text-zinc-300">{verifyMessage}</p> : null}
    </section>

      {showIntegrityLedger ? (
        <section className="rounded border border-zinc-800/85 bg-zinc-950/60 p-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-200">
            Integrity ledger (Bank Vault)
          </h3>
          <p className="mt-1 text-[9px] text-zinc-500">
            Immutable <code className="text-zinc-400">IntegrityEvent</code> chain for this tenant (newest first).
            Payloads are not stored on-row; use signed export for full period bundles.
          </p>
          <div className="mt-3 overflow-x-auto rounded border border-zinc-800/80 bg-zinc-950/40">
            <table className="min-w-full border-collapse text-left text-[9px] text-zinc-300">
              <thead className="bg-zinc-900/80 text-[8px] font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-2 py-2">Time (UTC)</th>
                  <th className="px-2 py-2">Event</th>
                  <th className="px-2 py-2">Entity</th>
                  <th className="px-2 py-2">Actor</th>
                  <th className="px-2 py-2">Source</th>
                  <th className="px-2 py-2">Event hash</th>
                </tr>
              </thead>
              <tbody>
                {integrityLedger.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-4 text-center text-zinc-500">
                      No integrity events recorded for this tenant yet.
                    </td>
                  </tr>
                ) : (
                  integrityLedger.map((row) => (
                    <tr key={row.id} className="border-t border-zinc-800/70">
                      <td className="whitespace-nowrap px-2 py-1.5 font-mono text-zinc-400">
                        {new Date(row.createdAt).toISOString().replace("T", " ").slice(0, 19)}
                      </td>
                      <td className="px-2 py-1.5 text-zinc-200">{row.eventType}</td>
                      <td className="px-2 py-1.5">
                        <span className="text-zinc-500">{row.entityType}</span>
                        <span className="mx-1 text-zinc-600">·</span>
                        <span className="font-mono text-zinc-400">{shortHash(row.entityId, 12, 8)}</span>
                      </td>
                      <td className="max-w-[8rem] truncate px-2 py-1.5 font-mono text-zinc-400" title={row.actorUserId}>
                        {row.actorUserId}
                      </td>
                      <td className="px-2 py-1.5 text-zinc-500">{row.source}</td>
                      <td className="px-2 py-1.5 font-mono text-[8px] text-emerald-200/90" title={row.eventHash}>
                        {shortHash(row.eventHash, 12, 10)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
