"use client";

import { useEffect } from "react";
import { useReportStore } from "@/app/store/reportStore";
import { useRiskStore } from "@/app/store/riskStore";

export default function GrcAuditSummary() {
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const { recentEvents, refresh } = useReportStore();

  useEffect(() => {
    refresh();
  }, [refresh, selectedIndustry]);

  return (
    <section className="min-h-screen bg-slate-950 px-4 py-6">
      <div className="mx-auto max-w-6xl rounded-xl border border-slate-800 bg-[#0f172a]/50 backdrop-blur-md p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">
              GRC Audit Trail
            </h1>
            <p className="mt-1 text-[11px] text-slate-400">
              Immutable view of the last 10 GRC lifecycle events for board and regulator review.
              {selectedIndustry && (
                <span className="ml-2 rounded border border-slate-600 bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-300">
                  {selectedIndustry}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-950/60">
          <table className="min-w-full border-collapse text-[10px]">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">
                  Timestamp
                </th>
                <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">
                  User
                </th>
                <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">
                  Action
                </th>
                <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">
                  Justification
                </th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="bg-slate-950/60 px-3 py-3 text-center text-[11px] text-slate-500"
                  >
                    No GRC audit events recorded yet.
                  </td>
                </tr>
              )}
              {recentEvents.map((evt) => (
                <tr key={evt.timestamp + evt.action}>
                  <td className="border-t border-slate-800 px-3 py-2 text-slate-300">
                    {new Date(evt.timestamp).toLocaleString()}
                  </td>
                  <td className="border-t border-slate-800 px-3 py-2 text-slate-300">
                    {evt.userId}
                  </td>
                  <td className="border-t border-slate-800 px-3 py-2 text-slate-300">
                    {evt.action}
                  </td>
                  <td className="border-t border-slate-800 px-3 py-2 text-rose-300">
                    {evt.justification ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

