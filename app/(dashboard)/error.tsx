"use client";

import AccessPending from "@/app/components/AccessPending";
import Link from "next/link";

type DashboardRouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Catches uncaught server errors in the dashboard route group (digest 1041080224 class)
 * and routes operators to access pending instead of a blank application error.
 */
export default function DashboardRouteError({ error, reset }: DashboardRouteErrorProps) {
  const digest = error.digest?.trim();
  const isLikelyRbacGap =
    digest === "1041080224" ||
    /not found|user_role|role assignment|unauthorized/i.test(error.message ?? "");

  if (isLikelyRbacGap) {
    return <AccessPending />;
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-lg flex-col items-center justify-center px-6 py-16 text-slate-200">
      <div className="w-full rounded-xl border border-rose-500/30 bg-slate-950/90 p-8">
        <h1 className="text-xl font-semibold text-white">Dashboard unavailable</h1>
        <p className="mt-3 text-sm text-slate-300">
          A server error blocked this view. Retry or return to a safe route.
        </p>
        {digest ? (
          <p className="mt-2 font-mono text-[10px] text-slate-500">Digest: {digest}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-cyan-600/90 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-500"
          >
            Retry
          </button>
          <Link
            href="/unauthorized"
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-400"
          >
            Access status
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-400"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
