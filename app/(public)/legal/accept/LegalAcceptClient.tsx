"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { IRONFRAME_PRIVACY_VERSION, IRONFRAME_TERMS_VERSION } from "@/config/legal";

export default function LegalAcceptClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!checked) {
      setError("You must accept the agreements to continue.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/legal/accept", { method: "POST" });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setError(body.error ?? "Acceptance failed.");
        return;
      }
      router.replace(next.startsWith("/") ? next : "/");
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--login-muted)]">
        Legal acceptance required
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">
        Enterprise workspace agreements
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-[var(--login-muted)]">
        Before entering your isolated tenant enclave, confirm that you have read and agree to the
        current Master Service Agreement and Privacy Framework. Your acceptance is recorded with a
        SHA-256 cryptographic hash tied to your operator identity and document versions{" "}
        <span className="font-mono text-[var(--text-main)]">
          {IRONFRAME_TERMS_VERSION} / {IRONFRAME_PRIVACY_VERSION}
        </span>
        .
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--login-muted)]">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[var(--login-border)]"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" target="_blank" className="text-[var(--login-accent)] hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="text-[var(--login-accent)] hover:underline"
            >
              Privacy Framework
            </Link>
            .
          </span>
        </label>
        {error ? (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || !checked}
          className="w-full rounded-md bg-[var(--login-accent)] py-3 font-mono text-sm font-bold text-[var(--bg-primary)] disabled:opacity-40"
        >
          {busy ? "Recording acceptance…" : "Accept and continue"}
        </button>
      </form>
    </main>
  );
}
