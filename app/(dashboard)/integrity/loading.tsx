export default function IntegrityHubLoading() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-slate-300"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500/30 border-t-teal-400" />
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400/90">
        Loading Integrity Hub
      </p>
    </div>
  );
}
