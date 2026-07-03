export default function DashboardLoading() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-slate-300"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative h-1.5 w-64 overflow-hidden rounded-full bg-slate-800">
        <div className="ironframe-route-loading-bar absolute inset-y-0 left-0 w-1/3 rounded-full bg-cyan-400/90" />
      </div>
      <p className="animate-pulse font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/80">
        Synchronizing workspace ledger…
      </p>
    </div>
  );
}
