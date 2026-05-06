"use client";

import { useEffect, useState } from "react";
import { listAuditorRiskLedger, type AuditorRiskLedgerRow } from "@/app/actions/sentinelActions";

export default function AuditorRiskLedger() {
  const [rows, setRows] = useState<AuditorRiskLedgerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await listAuditorRiskLedger();
      if (cancelled) return;
      if (!r.ok) {
        setError(r.error);
        setRows([]);
        return;
      }
      setError(null);
      setRows(r.rows);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded border border-red-900/50 bg-red-950/30 px-4 py-3 text-[11px] text-red-200/95">
        {error}
      </div>
    );
  }

  if (rows === null) {
    return (
      <div className="rounded border border-slate-800 bg-slate-900/50 px-4 py-8 text-center text-[11px] text-slate-500">
        Loading auditor ledger…
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-slate-800 bg-slate-950/80">
      <table className="w-full min-w-[720px] border-collapse text-left text-[10px] text-slate-300">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/90 font-black uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2">Risk ID</th>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Control mappings</th>
            <th className="px-3 py-2">Forensic hash (SHA-256)</th>
            <th className="px-3 py-2">Digital signature</th>
            <th className="px-3 py-2">Signed at</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                No shadow RiskEvent rows for this tenant.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-800/80 align-top hover:bg-slate-900/40">
                <td className="px-3 py-2 font-mono text-[9px] text-cyan-200/90">{row.id}</td>
                <td className="max-w-[200px] px-3 py-2 text-slate-200">{row.title}</td>
                <td className="px-3 py-2 font-mono text-[9px] text-slate-400">
                  {row.mappedControls.length ? row.mappedControls.join("; ") : "—"}
                </td>
                <td className="max-w-[220px] break-all px-3 py-2 font-mono text-[8px] text-emerald-200/85">
                  {row.governanceHash ?? "—"}
                </td>
                <td className="max-w-[160px] break-words px-3 py-2 text-slate-300">
                  {row.digitalSignature ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-[9px] text-slate-500">
                  {row.signedAt ? new Date(row.signedAt).toISOString() : "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
