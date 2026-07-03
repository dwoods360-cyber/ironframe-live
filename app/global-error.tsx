"use client";

import { useEffect, useState } from "react";

import { isChunkLoadError, recoverFromChunkLoadError } from "@/app/utils/chunkLoadRecovery";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Catches failures in the root layout itself. Must define its own html/body shell.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [chunkReloading, setChunkReloading] = useState(false);

  useEffect(() => {
    console.error("[ironframe] global error:", error);
    if (isChunkLoadError(error)) {
      setChunkReloading(true);
      recoverFromChunkLoadError();
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 font-sans text-slate-200 antialiased">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-16">
          <div className="w-full rounded-xl border border-rose-500/40 bg-slate-900 p-8">
            <h1 className="text-xl font-semibold text-white">
              {isChunkLoadError(error) ? "Refreshing application bundle" : "Application shell failure"}
            </h1>
            <p className="mt-3 text-sm text-slate-300">
              {isChunkLoadError(error)
                ? chunkReloading
                  ? "Stale chunk after rebuild — reloading once…"
                  : "Chunk load failed. Run npm run dev:clean and hard refresh."
                : "The root layout could not render. Restart the dev server after clearing .next."}
            </p>
            {error.digest ? (
              <p className="mt-2 font-mono text-[10px] text-slate-500">Digest: {error.digest}</p>
            ) : null}
            <button
              type="button"
              onClick={() => reset()}
              className="mt-6 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
            >
              Retry
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
