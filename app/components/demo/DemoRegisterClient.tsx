"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { DemoEvaluationBanner } from "@/app/components/demo/DemoSandboxBanner";
import {
  DEMO_ALE_BASELINE_DISPLAY,
  DEMO_ORG_NAME,
  DEMO_WORKSPACE_SLUG,
  buildDemoDashboardUrl,
  initializeDemoSandbox,
} from "@/app/lib/demo/demoMode";

const industryRows = [
  { key: "medshield", sector: "Healthcare" },
  { key: "vaultbank", sector: "Finance" },
  { key: "gridcore", sector: "Infrastructure" },
] as const;

/**
 * Zero-friction demo entry — mock auth, client-only tenant seed, no Supabase invite.
 */
export default function DemoRegisterClient() {
  const [busy, setBusy] = useState(false);

  const onExploreSandbox = useCallback(() => {
    setBusy(true);
    initializeDemoSandbox();
    window.location.assign(buildDemoDashboardUrl());
  }, []);

  return (
    <div className="flex min-h-[70vh] flex-col bg-[var(--bg-primary)]">
      <DemoEvaluationBanner className="sticky top-0 z-10" />

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-12">
        <header className="space-y-2 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-cyan-400/90">
            Evaluation Sandbox
          </p>
          <h1 className="text-2xl font-semibold text-[var(--text-main)]">{DEMO_ORG_NAME}</h1>
          <p className="text-sm text-[var(--login-muted)]">
            Workspace <span className="font-mono text-cyan-300/90">{DEMO_WORKSPACE_SLUG}</span> —
            mock-authenticated preview with no database commits.
          </p>
        </header>

        <section
          className="rounded-lg border border-[var(--login-border)] bg-[var(--bg-primary)] p-5"
          aria-label="Irontrust ALE architecture baselines"
        >
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-wider text-[var(--login-muted)]">
            ALE architecture baselines (BigInt cents)
          </h2>
          <ul className="space-y-2">
            {industryRows.map((row) => (
              <li
                key={row.key}
                className="flex items-center justify-between gap-4 border-b border-[var(--login-border)]/60 py-2 last:border-0"
              >
                <span className="text-sm text-[var(--text-main)]">
                  {row.key.charAt(0).toUpperCase() + row.key.slice(1)}{" "}
                  <span className="text-[var(--login-muted)]">· {row.sector}</span>
                </span>
                <span className="font-mono text-sm text-cyan-200/90">
                  {DEMO_ALE_BASELINE_DISPLAY[row.key]}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onExploreSandbox}
            disabled={busy}
            className="w-full rounded-md border border-cyan-500/60 bg-cyan-950/40 px-6 py-3 font-mono text-sm font-semibold uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-900/50 disabled:cursor-wait sm:w-auto"
          >
            {busy ? "Launching sandbox…" : "Explore Sandbox"}
          </button>
          <Link
            href="/register/contact"
            className="text-center text-sm text-[var(--login-muted)] underline-offset-2 hover:text-[var(--text-main)] hover:underline"
          >
            Provision a permanent enclave
          </Link>
        </div>
      </div>
    </div>
  );
}
