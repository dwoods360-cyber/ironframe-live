"use client";

import { useEvidenceStore } from "@/app/store/evidenceStore";

export default function EvidencePage() {
  const evidenceRows = useEvidenceStore();

  return (
    <div className="min-h-full bg-slate-950 p-6">
      <section className="rounded border border-slate-800 bg-slate-900/40">
        <div className="border-b border-slate-800 px-4 py-3">
          <h1 className="text-[11px] font-bold uppercase tracking-wide text-white">EVIDENCE LOCKER</h1>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[10px] text-slate-200">
            <thead className="border-b border-slate-800 bg-slate-950/70">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-white">Document Name</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-white">Hash ID</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-white">Source Entity</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-white">Timestamp</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-white">Status</th>
              </tr>
            </thead>
            <tbody>
              {evidenceRows.map((row, index) => {
                const isVerified = row.status === "VERIFIED";
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-800 ${index % 2 === 0 ? "bg-slate-900/30" : "bg-slate-950/20"}`}
                  >
                    <td className="px-3 py-2 font-semibold text-white">{row.name}</td>
                    <td className="px-3 py-2 text-slate-300">{row.hash}</td>
                    <td className="px-3 py-2 text-slate-300">{row.entity}</td>
                    <td className="px-3 py-2 text-slate-300">{row.timestamp}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase ${
                          isVerified ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isVerified ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                          }`}
                        />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
