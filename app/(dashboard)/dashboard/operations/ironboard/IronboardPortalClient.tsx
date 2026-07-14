"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { formatElapsedDowntime } from "@/app/lib/formatDowntime";
import { ironboardConsoleProxyPath } from "@/app/lib/ironboardConsolePaths";

type IronboardEngineHealthSnapshot = {
  checkedAt: string;
  reachable: boolean;
  status: string | null;
  latencyMs: number | null;
  healthUrl: string;
  upstreamBase: string;
  error: string | null;
  retryIntervalSec: number;
  /** Public HTTPS engine URL when available; otherwise same-origin console proxy path. */
  boardroomEmbedUrl?: string;
};

const RUNBOOK_STEPS = [
  {
    title: "Confirm fleet telemetry",
    detail:
      "Open Operations Hub → Workforce. Ironboard (:8082) should show ○ down while the engine is offline.",
  },
  {
    title: "Verify upstream URL",
    detail:
      "Production must set IRONBOARD_URL or OPERATIONS_IRONBOARD_URL to a reachable :8082 host — not 127.0.0.1 from the browser.",
  },
  {
    title: "Restart the boardroom engine",
    detail:
      "Local: cd Ironboard && npm run dev (or npm run dev:safe). Production: redeploy/restart the Ironboard Cloud Run or VM service.",
  },
  {
    title: "Probe /health directly",
    detail:
      'GET {upstream}/health should return status HEALTHY and service ironboard. The health URL below is what this portal probes.',
  },
  {
    title: "Reload when green",
    detail:
      "This page auto-retries every 20s. When the next probe succeeds, the 17-agent boardroom iframe loads automatically.",
  },
] as const;

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function IronboardPortalClient() {
  const [health, setHealth] = useState<IronboardEngineHealthSnapshot | null>(null);
  const [checking, setChecking] = useState(true);
  const [nextRetrySec, setNextRetrySec] = useState(0);
  const [outageStartedAt, setOutageStartedAt] = useState<number | null>(null);
  const [lastSuccessAt, setLastSuccessAt] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const nextProbeAtRef = useRef<number | null>(null);
  const outageStartedRef = useRef<number | null>(null);

  const applyHealth = useCallback((snapshot: IronboardEngineHealthSnapshot) => {
    setHealth(snapshot);
    if (snapshot.reachable) {
      outageStartedRef.current = null;
      setOutageStartedAt(null);
      setLastSuccessAt(snapshot.checkedAt);
    } else if (!outageStartedRef.current) {
      const started = Date.parse(snapshot.checkedAt) || Date.now();
      outageStartedRef.current = started;
      setOutageStartedAt(started);
    }
    nextProbeAtRef.current = Date.now() + snapshot.retryIntervalSec * 1000;
    setNextRetrySec(snapshot.retryIntervalSec);
  }, []);

  const runHealthCheck = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/admin/operations-hub/ironboard-health", {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as
        | (IronboardEngineHealthSnapshot & { error?: string })
        | null;
      if (data?.checkedAt) {
        applyHealth(data);
        return;
      }
      applyHealth({
        checkedAt: new Date().toISOString(),
        reachable: false,
        status: null,
        latencyMs: null,
        healthUrl: "—",
        upstreamBase: "—",
        error:
          data?.error ||
          (response.ok ? "Health check returned an empty payload" : `Health check HTTP ${response.status}`),
        retryIntervalSec: 20,
      });
    } catch {
      applyHealth({
        checkedAt: new Date().toISOString(),
        reachable: false,
        status: null,
        latencyMs: null,
        healthUrl: "—",
        upstreamBase: "—",
        error: "Health check request failed",
        retryIntervalSec: 20,
      });
    } finally {
      setChecking(false);
    }
  }, [applyHealth]);

  useEffect(() => {
    void runHealthCheck();
  }, [runHealthCheck]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      const nextProbeAt = nextProbeAtRef.current;
      if (nextProbeAt) {
        setNextRetrySec(Math.max(0, Math.ceil((nextProbeAt - Date.now()) / 1000)));
        if (Date.now() >= nextProbeAt) {
          void runHealthCheck();
        }
      }

      const outageStart = outageStartedRef.current;
      if (outageStart) {
        setElapsedMs(Date.now() - outageStart);
      } else {
        setElapsedMs(0);
      }
    }, 1000);

    return () => window.clearInterval(tick);
  }, [runHealthCheck]);

  const isOnline = health?.reachable === true;
  const showOfflinePanel = !checking && !isOnline;

  return (
    <div className="flex min-h-screen flex-col bg-[#020617] text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
            IronBoard · 17-Agent Boardroom
          </p>
          <h1 className="text-lg font-bold text-white">Executive boardroom console</h1>
          <p className="mt-1 text-xs text-slate-500">
            GLOBAL_ADMIN only · CRM flywheel · live query roster · market integration
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runHealthCheck()}
            disabled={checking}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-600 disabled:opacity-50"
          >
            {checking ? "Checking…" : "Probe now"}
          </button>
          <a
            href={health?.boardroomEmbedUrl || "https://ironframe-ironboard-4qpposvc7q-uc.a.run.app/"}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-cyan-800/60 px-4 py-2 text-sm text-cyan-200 hover:border-cyan-500"
          >
            Open board in new tab
          </a>
          <Link
            href="/dashboard/operations"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-600"
          >
            ← Operations hub
          </Link>
        </div>
      </header>

      {checking && !health ? (
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-400">
          Probing Ironboard engine health…
        </div>
      ) : null}

      {showOfflinePanel ? (
        <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-6">
          <section className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-5">
            <h2 className="text-lg font-semibold text-rose-100">Ironboard engine offline</h2>
            <p className="mt-2 text-sm text-rose-200/90">
              The :8082 boardroom process is unreachable from Ironframe. This is not a guaranteed
              recovery ETA — follow the runbook below while auto-probes continue.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-rose-900/40 bg-slate-950/50 p-3">
                <div className="text-[10px] uppercase tracking-widest text-slate-500">
                  Unreachable for
                </div>
                <div className="mt-1 font-mono text-xl font-bold text-amber-300">
                  {formatElapsedDowntime(elapsedMs)}
                </div>
              </div>
              <div className="rounded-lg border border-rose-900/40 bg-slate-950/50 p-3">
                <div className="text-[10px] uppercase tracking-widest text-slate-500">
                  Next probe in
                </div>
                <div className="mt-1 font-mono text-xl font-bold text-cyan-300">{nextRetrySec}s</div>
              </div>
              <div className="rounded-lg border border-rose-900/40 bg-slate-950/50 p-3">
                <div className="text-[10px] uppercase tracking-widest text-slate-500">
                  Last healthy
                </div>
                <div className="mt-1 text-xs font-medium text-slate-200">
                  {formatTimestamp(lastSuccessAt)}
                </div>
              </div>
            </div>
            {health?.error ? (
              <p className="mt-3 font-mono text-xs text-rose-300/90">
                Probe error: {health.error}
              </p>
            ) : null}
            {health?.healthUrl ? (
              <p className="mt-2 font-mono text-[10px] text-slate-500">
                Health URL: {health.healthUrl}
              </p>
            ) : null}
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-white">Operator runbook</h2>
            <ol className="mt-4 space-y-4">
              {RUNBOOK_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-700/60 bg-amber-950/40 text-xs font-bold text-amber-300">
                    {index + 1}
                  </span>
                  <div>
                    <div className="font-medium text-slate-100">{step.title}</div>
                    <p className="mt-1 text-slate-400">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/dashboard/operations"
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-cyan-200 hover:border-cyan-600"
              >
                Open Operations Hub
              </Link>
            </div>
          </section>
        </div>
      ) : null}

      {isOnline ? (
        <iframe
          key={health?.boardroomEmbedUrl ?? health?.checkedAt ?? "online"}
          title="IronBoard 17-Agent Boardroom"
          src={health?.boardroomEmbedUrl || ironboardConsoleProxyPath()}
          className="min-h-0 w-full flex-1 border-0 bg-[#020617]"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : null}
    </div>
  );
}
