import Link from "next/link";

export default function DocsNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 font-mono text-slate-400 antialiased">
      <nav className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b border-slate-900 bg-slate-950/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            IRONFRAME CORE <span className="text-slate-700">|</span>{" "}
            <span className="text-teal-400">REFERENCE MANUALS</span>
          </span>
        </div>
        <Link
          href="/"
          className="rounded border border-teal-900/50 bg-teal-950/30 px-4 py-1.5 text-xs font-bold tracking-wider text-teal-400 transition-all hover:bg-teal-500 hover:text-slate-950"
        >
          ➔ RETURN TO OPERATIONS DASHBOARD
        </Link>
      </nav>

      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="mb-2 font-bold text-rose-500">❌ ROUTE NOT FOUND</p>
        <p className="mb-6 text-xs text-slate-600">
          The requested manual path does not exist in this repository.
        </p>
        <Link
          href="/"
          className="rounded border border-slate-800 bg-slate-900 px-4 py-2 text-xs text-teal-400 transition-all hover:bg-teal-500/10"
        >
          ➔ SAFELY RETURN TO DASHBOARD
        </Link>
      </div>
    </div>
  );
}
