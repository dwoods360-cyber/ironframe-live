"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { inboundLeadSuccessCopy } from "@/config/commercialGates";
import { PUBLIC_LEAD_API_PATH } from "@/config/registration";
import {
  CUSTOMER_FACING_PATH_B_SKU,
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  WORKFLOW_REVIEW_CTA_MINUTES,
  formatPathBUsd,
  formatPlannedGaCommandUsd,
} from "@/lib/ironframeProductKnowledge/commercial";

export default function SalesContactClient() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fieldClass =
    "mt-1.5 w-full rounded-md border border-[var(--login-border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--login-accent)]";

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const orgName = String(fd.get("company") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const reportedAleDollars = String(fd.get("reportedAle") ?? "").trim();

    try {
      const res = await fetch(PUBLIC_LEAD_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName,
          email,
          reportedAleDollars: reportedAleDollars || undefined,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setError(body.error ?? "Could not submit your request.");
        return;
      }
      setSubmitted(true);
      form.reset();
    } catch {
      setError("Something went wrong submitting the form. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="ironframe-public-funnel mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--login-muted)]">
        For MSSPs, vCISOs, and multi-entity CISOs
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">
        Schedule a {WORKFLOW_REVIEW_CTA_MINUTES} minute workflow review
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--login-muted)]">
        <span className="font-medium text-[var(--text-main)]">What to expect:</span> a direct{" "}
        {WORKFLOW_REVIEW_CTA_MINUTES} minute conversation on your current evidence collection and
        board-reporting friction — zero pitch decks.
      </p>
      <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm leading-relaxed text-amber-100">
        <span className="font-medium">Design partner note:</span> Submitting this form does not
        create a workspace. {CUSTOMER_FACING_PATH_B_SKU} is a fixed {DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}
        -day cohort at {formatPathBUsd()} flat — credited to year-1 Command (planned GA ~
        {formatPlannedGaCommandUsd()}/yr) if you convert in-window. We do not offer free trials or
        unmanaged PoCs. Workspaces are provisioned after mutual alignment on success criteria.
      </p>
      <p className="mt-3 text-sm text-[var(--login-muted)]">
        Prefer to explore the platform first?{" "}
        <Link href="/product-demo" className="text-cyan-300 underline hover:opacity-90">
          Open guided demonstration →
        </Link>
      </p>

      {submitted ? (
        <div
          className="mt-8 rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-5 text-sm text-emerald-100"
          role="status"
        >
          {inboundLeadSuccessCopy(WORKFLOW_REVIEW_CTA_MINUTES)}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-[11px] text-[var(--login-muted)]">
            Work email
            <input
              name="email"
              type="email"
              required
              className={fieldClass}
              autoComplete="email"
              placeholder="name@company.com"
            />
          </label>
          <label className="block text-[11px] text-[var(--login-muted)]">
            Organization
            <input
              name="company"
              required
              className={fieldClass}
              autoComplete="organization"
              placeholder="Legal company name"
            />
          </label>
          <label className="block text-[11px] text-[var(--login-muted)]">
            Estimated annual loss exposure (USD, optional)
            <input
              name="reportedAle"
              inputMode="decimal"
              className={fieldClass}
              placeholder="$ e.g. 5,900,000"
            />
          </label>
          {error ? (
            <p className="text-sm text-rose-400" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-[var(--login-accent)] py-3 font-mono text-sm font-bold text-[var(--bg-primary)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Submitting…" : `Schedule ${WORKFLOW_REVIEW_CTA_MINUTES} min workflow review`}
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-xs text-[var(--login-muted)]">
        <Link href="/pricing" className="text-[var(--login-accent)] hover:underline">
          View {CUSTOMER_FACING_PATH_B_SKU} packaging
        </Link>
        {" · "}
        Already have a workspace invite?{" "}
        <Link href="/login" className="text-[var(--login-accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
