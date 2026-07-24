"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import {
  GUIDED_DEMO_COMPANY,
  GUIDED_WORKFLOW_STEPS,
} from "@/app/lib/demo/guidedWorkflowSteps";
import {
  CUSTOMER_FACING_PATH_B_SKU,
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  WORKFLOW_REVIEW_CTA_MINUTES,
  formatPathBUsd,
} from "@/lib/ironframeProductKnowledge/commercial";
import { SALES_CONTACT_PATH } from "@/config/registration";
import { initializeDemoSandbox } from "@/app/lib/demo/demoMode";

export default function GuidedWorkflowDemoClient() {
  const [stepIndex, setStepIndex] = useState(0);
  const step = GUIDED_WORKFLOW_STEPS[stepIndex]!;
  const total = GUIDED_WORKFLOW_STEPS.length;
  const progressPct = useMemo(() => Math.round(((stepIndex + 1) / total) * 100), [stepIndex, total]);

  const goSandbox = useCallback((href: string) => {
    initializeDemoSandbox();
    window.location.assign(href);
  }, []);

  return (
    <main className="ironframe-public-funnel mx-auto min-h-screen max-w-3xl px-6 py-10 text-[var(--text-main)]">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan-400/90">
        Guided product tour
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Control-first workflow — guided tour
      </h1>
      <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
        {GUIDED_DEMO_COMPANY.disclaimer}
      </p>
      <p className="mt-2 rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm leading-relaxed text-slate-300">
        This tour uses sample demonstration data in a read-only preview. It does not create an
        account, request production credentials, or change live systems.
      </p>
      <p className="mt-3 text-sm text-[var(--login-muted)]">
        Sample workspace · {GUIDED_DEMO_COMPANY.name}
      </p>

      <ol className="mt-8 flex flex-wrap gap-2" aria-label="Workflow steps">
        {GUIDED_WORKFLOW_STEPS.map((item, index) => {
          const active = index === stepIndex;
          const done = index < stepIndex;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setStepIndex(index)}
                className={[
                  "rounded border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition",
                  active
                    ? "border-cyan-500/70 bg-cyan-950/50 text-cyan-100"
                    : done
                      ? "border-emerald-800/60 bg-emerald-950/20 text-emerald-200/90"
                      : "border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-500",
                ].join(" ")}
                aria-current={active ? "step" : undefined}
              >
                {index + 1}. {item.chipLabel}
              </button>
            </li>
          );
        })}
      </ol>

      <div
        className="mt-4 h-1.5 overflow-hidden rounded bg-slate-800"
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Guided demo progress"
      >
        <div className="h-full bg-cyan-500/80 transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      <article className="mt-8 rounded-lg border border-[var(--login-border)] bg-[var(--bg-secondary)] p-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--login-muted)]">
          Step {stepIndex + 1} of {total}
        </p>
        <h2 className="mt-2 text-2xl font-semibold">{step.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--login-muted)]">{step.summary}</p>
        <p className="mt-4 text-sm font-medium text-[var(--text-main)]">
          Outcome: {step.outcome}
        </p>
        <ul className="mt-5 space-y-2 border-t border-[var(--login-border)] pt-5 text-sm text-[var(--login-muted)]">
          {step.evidence.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500/80" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {step.sandboxHref ? (
            <button
              type="button"
              onClick={() => goSandbox(step.sandboxHref!)}
              className="inline-flex h-11 items-center justify-center rounded-md border border-cyan-500/60 bg-cyan-950/40 px-4 font-mono text-xs font-semibold uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-900/50"
            >
              Open related demo view
            </button>
          ) : null}
          <Link
            href={SALES_CONTACT_PATH}
            className="inline-flex h-11 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Request a {WORKFLOW_REVIEW_CTA_MINUTES} min workflow review
          </Link>
        </div>
      </article>

      <div className="mt-6 flex items-center justify-between gap-4">
        <button
          type="button"
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          className="inline-flex h-10 items-center rounded border border-slate-700 px-4 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        {stepIndex < total - 1 ? (
          <button
            type="button"
            onClick={() => setStepIndex((i) => Math.min(total - 1, i + 1))}
            className="inline-flex h-10 items-center rounded border border-cyan-700/60 bg-cyan-950/30 px-4 text-sm text-cyan-100"
          >
            Next step
          </button>
        ) : (
          <Link
            href={SALES_CONTACT_PATH}
            className="inline-flex h-10 items-center rounded bg-indigo-600 px-4 text-sm font-semibold text-white"
          >
            Continue to workflow review · {formatPathBUsd()} {CUSTOMER_FACING_PATH_B_SKU} ·{" "}
            {DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day window
          </Link>
        )}
      </div>

      <p className="mt-10 text-xs text-[var(--login-muted)]">
        This page is a guided product tour only — not a live partner workspace. Ready to talk?{" "}
        <Link href={SALES_CONTACT_PATH} className="text-cyan-300 underline hover:opacity-90">
          Request a {WORKFLOW_REVIEW_CTA_MINUTES} min workflow review
        </Link>
        .
      </p>
    </main>
  );
}
