"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  clearClientDriftReloadLatch,
  hasClientDriftReloadAlreadyAttempted,
  isRecoverableClientDriftError,
  recoverFromClientDriftError,
} from "@/app/utils/chunkLoadRecovery";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Keep Ops Hub failures inside this segment — do not escalate to root
 * "Application shell failure" when a worker-chat / snapshot chunk drifts.
 */
export default function OperationsHubError({ error, reset }: Props) {
  const recoverable = isRecoverableClientDriftError(error);
  const [reloadSpent, setReloadSpent] = useState(false);

  useEffect(() => {
    console.error("[ironframe] ops hub error:", error);
    if (!recoverable) return;
    if (hasClientDriftReloadAlreadyAttempted()) {
      setReloadSpent(true);
      return;
    }
    const started = recoverFromClientDriftError();
    if (!started) setReloadSpent(true);
  }, [error, recoverable]);

  const title = recoverable
    ? reloadSpent
      ? "Ops Hub needs a fresh session"
      : "Refreshing Ops Hub after deploy"
    : "Ops Hub hit an error";

  const body = recoverable
    ? reloadSpent
      ? "Auto-reload already ran once for this tab. Sign in fresh (clears the stale desk bundle), then reopen Ironleads. This is not an Integrity Hub failure."
      : "This desk loaded a stale client bundle. Reloading once…"
    : "Other Ironframe pages can still work. Retry Ops Hub, or open a fresh login and come back.";

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center bg-[#020617] px-6 py-16 text-slate-100">
      <div className="w-full max-w-lg rounded-xl border border-rose-500/30 bg-slate-950/90 p-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-rose-300">Ops Hub</p>
        <h1 className="mt-2 text-xl font-semibold text-white">{title}</h1>
        <p className="mt-3 text-sm text-slate-300">{body}</p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[10px] text-slate-500">Digest: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              if (recoverable && !hasClientDriftReloadAlreadyAttempted()) {
                recoverFromClientDriftError();
                return;
              }
              clearClientDriftReloadLatch();
              reset();
              try {
                const url = new URL(window.location.href);
                url.searchParams.set("_if_recover", Date.now().toString());
                window.location.replace(url.toString());
              } catch {
                window.location.reload();
              }
            }}
            className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
          >
            Retry Ops Hub
          </button>
          <Link
            href="/login?fresh=1&next=%2Fdashboard%2Foperations%2Fironleads"
            onClick={() => clearClientDriftReloadLatch()}
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:border-cyan-500"
          >
            Sign in fresh
          </Link>
          <Link
            href="/integrity"
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:border-slate-400"
          >
            Integrity Hub
          </Link>
        </div>
      </div>
    </main>
  );
}
