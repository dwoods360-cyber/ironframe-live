"use client";

import { useEffect, useState } from "react";

import {
  isChunkLoadError,
  isRecoverableClientDriftError,
  isStaleDeploymentClientError,
  recoverFromClientDriftError,
} from "@/app/utils/chunkLoadRecovery";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Catches failures in the root layout itself. Must define its own html/body shell.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [reloading, setReloading] = useState(false);
  const recoverable = isRecoverableClientDriftError(error);
  const staleDeploy = isStaleDeploymentClientError(error);
  const chunkStale = isChunkLoadError(error);

  useEffect(() => {
    console.error("[ironframe] global error:", error);
    if (recoverable) {
      setReloading(true);
      recoverFromClientDriftError();
    }
  }, [error, recoverable]);

  const title = recoverable
    ? staleDeploy
      ? "Refreshing after deploy"
      : "Refreshing application bundle"
    : "Application shell failure";

  const body = recoverable
    ? reloading
      ? staleDeploy
        ? "Your phone or browser kept an older Ironframe build. Reloading once…"
        : "Stale chunk after rebuild — reloading once…"
      : "Client bundle is out of date. Tap Retry, or open a fresh login URL below."
    : "The root layout could not render. This is usually a stale phone session after a deploy — not a local .next problem. Tap Sign in fresh below.";

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 font-sans text-slate-200 antialiased">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-16">
          <div className="w-full rounded-xl border border-rose-500/40 bg-slate-900 p-8">
            <h1 className="text-xl font-semibold text-white">{title}</h1>
            <p className="mt-3 text-sm text-slate-300">{body}</p>
            {error.digest ? (
              <p className="mt-2 font-mono text-[10px] text-slate-500">Digest: {error.digest}</p>
            ) : null}
            {chunkStale || staleDeploy ? (
              <p className="mt-2 text-xs text-slate-500">
                Tip: iOS Safari → Settings → Apps → Safari → Advanced → Website Data → remove
                ironframegrc.com if Retry loops.
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  if (recoverable) {
                    recoverFromClientDriftError();
                    return;
                  }
                  reset();
                }}
                className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
              >
                Retry
              </button>
              <a
                href={`/login?fresh=1&_=${Date.now()}`}
                className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 hover:border-cyan-500"
              >
                Sign in fresh
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
