"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { PUBLIC_LEAD_API_PATH } from "@/config/registration";

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
      setError("Network error — ensure the dev server is running on localhost.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="ironframe-public-funnel mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--login-muted)]">
        Sales-assisted onboarding
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">
        Request a secure enterprise enclave
      </h1>
      <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm font-medium text-amber-100">
        Request evaluation — no workspace created yet.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[var(--login-muted)]">
        This form records a <strong className="font-medium text-[var(--text-main)]">sales lead / design-partner inquiry</strong> only — no tenant workspace is created. Live enclaves are minted later via sales-assisted invite (Path B activation), never from this page. Share your details and our team will coordinate a scoped evaluation.
      </p>

      {submitted ? (
        <div
          className="mt-8 rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-5 text-sm text-emerald-100"
          role="status"
        >
          Thank you — your request has been recorded in the executive lead ledger. A sales engineer
          will follow up to issue your administrative invite link.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-[11px] text-[var(--login-muted)]">
            Full name
            <input name="name" required className={fieldClass} autoComplete="name" />
          </label>
          <label className="block text-[11px] text-[var(--login-muted)]">
            Work email
            <input
              name="email"
              type="email"
              required
              className={fieldClass}
              autoComplete="email"
            />
          </label>
          <label className="block text-[11px] text-[var(--login-muted)]">
            Organization
            <input name="company" required className={fieldClass} autoComplete="organization" />
          </label>
          <label className="block text-[11px] text-[var(--login-muted)]">
            Estimated annual loss exposure (USD, optional)
            <input
              name="reportedAle"
              inputMode="decimal"
              className={fieldClass}
              placeholder="e.g. 11,100,000"
            />
          </label>
          <label className="block text-[11px] text-[var(--login-muted)]">
            What are you evaluating?
            <textarea
              name="message"
              rows={4}
              className={fieldClass}
              placeholder="Regulatory scope, tenant isolation requirements, timeline…"
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
            {busy ? "Submitting…" : "Contact sales"}
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-xs text-[var(--login-muted)]">
        <Link href="/pricing" className="text-[var(--login-accent)] hover:underline">
          View Command Tier pricing
        </Link>
        {" · "}
        Already invited?{" "}
        <Link href="/login" className="text-[var(--login-accent)] hover:underline">
          Sign in to your workspace
        </Link>
      </p>
    </main>
  );
}
