interface CompilationIngressPortalProps {
  targetSlug: string;
}

export default function CompilationIngressPortal({ targetSlug }: CompilationIngressPortalProps) {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-blue-500/20 bg-blue-950/10 p-6 text-slate-300 shadow-2xl backdrop-blur-md">
      <h3 className="mb-1 flex items-center gap-2 font-mono text-sm font-bold tracking-wider text-cyan-400">
        Compilation ingress portal active
      </h3>
      <p className="mb-4 font-mono text-xs text-slate-400">WORKSPACE TARGET: {targetSlug}</p>
      <p className="text-sm leading-relaxed text-slate-300">
        The structural persistence table allocation is online, but no document entry matches the path
        requested. Seed the APP_DOCS corpus or push content via the documentation execute gateway.
      </p>
      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3 font-mono text-xs text-slate-400">
        <p className="mb-1 font-bold text-cyan-500">Route trigger instruction</p>
        <p>
          Invoke the automated board workforce to populate this dynamic target entry via payload
          deployment:
        </p>
        <p className="mt-2 select-all font-bold text-indigo-400">POST /api/documentation/execute</p>
        <p className="mt-3 border-t border-slate-800/80 pt-3 text-slate-500">
          Local seed:{" "}
          <code className="select-all text-cyan-400">npm run db:seed:app-documents</code>
        </p>
      </div>
    </div>
  );
}
