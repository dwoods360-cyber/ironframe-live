"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function DocsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[docs] reader failure:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 font-mono text-slate-300 antialiased">
      <nav className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b border-slate-900 bg-slate-950/80 px-6 backdrop-blur-md">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          IRONFRAME CORE <span className="text-slate-700">|</span>{" "}
          <span className="text-rose-400">DOCS READER FAULT</span>
        </span>
        <Link
          href="/"
          className="rounded border border-teal-900/50 bg-teal-950/30 px-4 py-1.5 text-xs font-bold tracking-wider text-teal-400 transition-all hover:bg-teal-500 hover:text-slate-950"
        >
          RETURN HOME
        </Link>
      </nav>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="font-bold text-rose-500">Documentation reader unavailable</p>
        <p className="max-w-lg text-xs leading-relaxed text-slate-500">
          The APP_DOCS database plane could not be reached. Confirm{" "}
          <code className="text-teal-400">DATABASE_URL</code> is set, run{" "}
          <code className="text-teal-400">npm run db:seed:app-documents</code>, then retry.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-xs text-teal-400 hover:bg-teal-500/10"
          >
            Retry
          </button>
          <Link
            href="/docs/README"
            className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-xs text-slate-400 hover:text-white"
          >
            Open docs hub
          </Link>
        </div>
      </div>
    </div>
  );
}
