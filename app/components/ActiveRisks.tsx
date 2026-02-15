import { ShieldAlert } from "lucide-react";

export default function ActiveRisks() {
  return (
    <section className="border-b border-slate-800 bg-slate-900/50 px-4 py-6">
      <div className="mb-4 border-b border-slate-800 pb-4">
        <div className="rounded border border-dashed border-slate-700 bg-slate-950/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-300">RISK REGISTRATION (0/10)</p>
            <button
              type="button"
              className="rounded bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-200 hover:bg-slate-700"
            >
              + MANUAL ENTRY
            </button>
          </div>
          <p className="text-[10px] text-slate-500">
            Registration queue empty. Select a threat or add manual entry.
          </p>
        </div>
      </div>

      <div className="mb-3">
        <h2 className="text-xs font-bold tracking-wide text-slate-100">ACTIVE RISKS (1)</h2>
      </div>

      <div className="rounded border border-slate-800 bg-slate-950/70 p-3">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <div>
              <p className="text-xs font-bold text-slate-100">RANSOMWARE THREAT</p>
              <p className="text-[10px] text-slate-400">Intelligence</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Risk Score</p>
            <p className="text-4xl font-extrabold text-red-500 leading-none">0.63</p>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between rounded border border-slate-800 bg-slate-900/40 px-2 py-1.5 text-[10px] font-semibold text-slate-300">
          <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-300">Intelligence</span>
          <span>L: 0.9 | I: 0.7</span>
        </div>

        <div className="mb-3 rounded border border-slate-800 bg-slate-900 p-2">
          <textarea
            className="h-20 w-full resize-none bg-transparent px-1 py-1 text-[10px] text-slate-200 outline-none placeholder:text-slate-500"
            placeholder="Add update note..."
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded bg-blue-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-blue-500"
            >
              SUBMIT
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-[10px] text-slate-400">
          <span>Registered: 2h ago</span>
          <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-300">ACTIVE</span>
        </div>
      </div>
    </section>
  );
}