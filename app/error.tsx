"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  isChunkLoadError,
  isRecoverableClientDriftError,
  isStaleDeploymentClientError,
  recoverFromClientDriftError,
} from "@/app/utils/chunkLoadRecovery";

type RootErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RootError({ error, reset }: RootErrorProps) {
  const [reloading, setReloading] = useState(false);
  const recoverable = isRecoverableClientDriftError(error);
  const staleDeploy = isStaleDeploymentClientError(error);
  const chunkStale = isChunkLoadError(error);

  useEffect(() => {
    console.error("[ironframe] route error:", error);
    if (recoverable) {
      setReloading(true);
      recoverFromClientDriftError();
    }
  }, [error, recoverable]);

  const digest = error.digest?.trim();

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col items-center justify-center bg-[#020617] px-6 py-16 text-slate-100">
      <div className="w-full rounded-xl border border-rose-500/30 bg-slate-950/90 p-8">
        <h1 className="text-xl font-semibold text-white">
          {recoverable
            ? staleDeploy
              ? "Refreshing after deploy"
              : "Refreshing application bundle"
            : "Something went wrong"}
        </h1>
        <p className="mt-3 text-sm text-slate-300">
          {recoverable
            ? reloading
              ? staleDeploy
                ? "Your browser kept an older Ironframe build. Reloading once…"
                : "A stale JavaScript chunk was detected. Reloading once…"
              : "Client bundle is out of date. Tap Retry, or clear this site’s data and sign in again."
            : "This view hit an unexpected server or client error. Retry or return to a safe route."}
        </p>
        {chunkStale || staleDeploy ? (
          <p className="mt-2 text-xs text-slate-500">
            On iPhone: Safari → Aa / Share → Clear Website Data for ironframegrc.com if Retry loops.
          </p>
        ) : null}
        {digest ? <p className="mt-2 font-mono text-[10px] text-slate-500">Digest: {digest}</p> : null}
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
            className="rounded-md bg-cyan-600/90 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-500"
          >
            Retry
          </button>
          <a
            href="/login?fresh=1"
            className="rounded-md border border-cyan-700/60 bg-cyan-950/40 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-500"
          >
            Sign in fresh
          </a>
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
