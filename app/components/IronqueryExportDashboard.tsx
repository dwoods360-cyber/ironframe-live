"use client";

import { useMemo, useState, useTransition } from "react";
import {
  downloadIronqueryAnalystPack,
  sealIronqueryComplianceExport,
  type IronqueryExportHistoryRow,
} from "@/app/actions/ironqueryExportActions";

type Props = {
  tenantId: string;
  history: IronqueryExportHistoryRow[];
};

function shortHash(hex: string): string {
  const t = hex.trim();
  if (t.length <= 18) return t;
  return `${t.slice(0, 10)}…${t.slice(-6)}`;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function triggerBrowserDownload(filename: string, contentType: string, base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function IronqueryExportDashboard({ tenantId, history }: Props) {
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const disabled = isPending;
  const rowCount = history.length;

  const subtitle = useMemo(
    () => `Tenant ${tenantId.slice(0, 8)}… · ${rowCount} sealed artifact${rowCount === 1 ? "" : "s"}`,
    [tenantId, rowCount],
  );

  function runDownload(format: "csv" | "pdf") {
    setStatusMessage(null);
    startTransition(async () => {
      const result = await downloadIronqueryAnalystPack(format);
      if (!result.ok) {
        setStatusMessage(result.error);
        return;
      }
      triggerBrowserDownload(result.filename, result.contentType, result.base64);
      setStatusMessage(`Downloaded ${result.filename}`);
    });
  }

  function runSeal(format: "csv" | "pdf", classification: "forensic" | "financial") {
    setStatusMessage(null);
    startTransition(async () => {
      const result = await sealIronqueryComplianceExport({ format, classification });
      if (!result.ok) {
        setStatusMessage(result.error);
        return;
      }
      setStatusMessage(
        `Sealed ${format.toUpperCase()} archive · artifact ${result.artifactId.slice(0, 12)}… · SHA ${shortHash(result.canonicalSha256)}`,
      );
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="border-b border-slate-800/90 pb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/90">
          Epic 16 · Analyst Export Console
        </p>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-100">Compliance Export Ledger</h1>
        <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
      </header>

      <section className="rounded-lg border border-slate-800/85 bg-slate-950/70 p-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-200">
          Generate secure packages
        </h2>
        <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
          Downloads use the analyst pack encoder. Seal actions persist tamper-evident WORM archives via the
          enterprise export API contract.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => runDownload("csv")}
            className="rounded border border-cyan-700/60 bg-cyan-950/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200 hover:bg-cyan-900/50 disabled:opacity-40"
          >
            Download CSV
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => runDownload("pdf")}
            className="rounded border border-cyan-700/60 bg-cyan-950/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200 hover:bg-cyan-900/50 disabled:opacity-40"
          >
            Download PDF
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => runSeal("csv", "forensic")}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-200 hover:bg-slate-800 disabled:opacity-40"
          >
            Seal CSV → WORM
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => runSeal("pdf", "forensic")}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-200 hover:bg-slate-800 disabled:opacity-40"
          >
            Seal PDF → WORM
          </button>
        </div>
        {statusMessage ? (
          <p className="mt-3 text-[10px] text-slate-400" role="status">
            {statusMessage}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-800/85 bg-slate-950/60 overflow-hidden">
        <div className="border-b border-slate-800/80 px-4 py-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-200">
            Historical sealed exports
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[10px]">
            <thead>
              <tr className="border-b border-slate-800/80 text-[9px] uppercase tracking-widest text-slate-500">
                <th className="px-4 py-2 font-semibold">Filename</th>
                <th className="px-4 py-2 font-semibold">Created</th>
                <th className="px-4 py-2 font-semibold">Metadata hash</th>
                <th className="px-4 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No sealed Ironquery exports for this tenant yet. Use Seal CSV/PDF to archive the first
                    package.
                  </td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr key={row.artifactId} className="border-b border-slate-800/50 hover:bg-slate-900/40">
                    <td className="px-4 py-2.5 font-mono text-slate-300">{row.filename}</td>
                    <td className="px-4 py-2.5 text-slate-400">{formatTimestamp(row.createdAt)}</td>
                    <td className="px-4 py-2.5 font-mono text-emerald-400/90" title={row.sha256}>
                      {shortHash(row.sha256)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded border border-emerald-800/50 bg-emerald-950/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
