"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { isChunkLoadError, recoverFromChunkLoadError } from "@/app/utils/chunkLoadRecovery";

type RootErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RootError({ error, reset }: RootErrorProps) {
  const [chunkReloading, setChunkReloading] = useState(false);

  useEffect(() => {
    console.error("[ironframe] route error:", error);
    if (isChunkLoadError(error)) {
      setChunkReloading(true);
      recoverFromChunkLoadError();
    }
  }, [error]);

  const digest = error.digest?.trim();
  const chunkStale = isChunkLoadError(error);

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col items-center justify-center bg-[#020617] px-6 py-16 text-slate-100">
      <div className="w-full rounded-xl border border-rose-500/30 bg-slate-950/90 p-8">
        <h1 className="text-xl font-semibold text-white">
          {chunkStale ? "Refreshing application bundle" : "Something went wrong"}
        </h1>
        <p className="mt-3 text-sm text-slate-300">
          {chunkStale
            ? chunkReloading
              ? "A stale JavaScript chunk was detected after a dev rebuild. Reloading once…"
              : "Chunk load failed. Clear .next and hard refresh, or click Retry."
            : "This view hit an unexpected server or client error. Retry or return to a safe route."}
        </p>
        {digest ? <p className="mt-2 font-mono text-[10px] text-slate-500">Digest: {digest}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-cyan-600/90 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-500"
          >
            Retry
          </button>
          <Link
            href="/"
            className="rounded-md border border-teal-700/60 bg-teal-950/40 px-4 py-2 text-sm font-medium text-teal-100 transition hover:border-teal-500 hover:bg-teal-900/50"
          >
            Home
          </Link>
          <Link
            href="/docs/README"
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-400"
          >
            Documentation
          </Link>
        </div>
      </div>
    </main>
  );
}
