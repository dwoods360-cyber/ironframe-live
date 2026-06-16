"use client";

import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { formatLocalTenantWorkspaceUrl } from "@/app/lib/tenantSubdomain";
import { isPublicRegistrationEnabled, SALES_CONTACT_PATH } from "@/config/registration";

type IntakeSuccessDetails = {
  tenantSlug: string;
  email: string;
};

type FieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
};

function RegistrationField({ label, hint, children }: FieldProps) {
  return (
    <div className="block text-[11px] text-[var(--login-muted)]">
      <span className="block">{label}</span>
      {hint ? (
        <span className="mt-0.5 block font-mono text-[10px] text-[var(--login-muted)]/65">
          {hint}
        </span>
      ) : null}
      {children}
    </div>
  );
}

function formatAleDollarsDisplay(digits: string): string {
  if (!digits) return "";
  return BigInt(digits).toLocaleString("en-US");
}

/** Whole-dollar string → whole-cent string for provision API. */
function dollarsToCentsPayload(dollarInput: string): string {
  const digits = dollarInput.replace(/\D/g, "");
  if (!digits) return "0";
  try {
    return (BigInt(digits) * 100n).toString();
  } catch {
    return "0";
  }
}

export default function PublicRegistrationClient() {
  const formRef = useRef<HTMLFormElement>(null);
  const [formReady, setFormReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedDetails, setSubmittedDetails] = useState<IntakeSuccessDetails | null>(null);
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [aleBaselineDollars, setAleBaselineDollars] = useState("");
  const [localPort, setLocalPort] = useState("3000");

  useEffect(() => {
    setLocalPort(window.location.port || "3000");
    setFormReady(true);
  }, []);

  const slugPreview = slug.trim() || "[slug]";
  const workspacePreviewUrl = formatLocalTenantWorkspaceUrl(slugPreview, localPort);

  const fieldClass =
    "mt-1.5 w-full rounded-md border border-[var(--login-border)] bg-[var(--bg-primary)] px-3 py-2 font-mono text-sm text-[var(--text-main)] outline-none focus:border-[var(--login-accent)]";

  const resetFormFields = () => {
    setOrgName("");
    setSlug("");
    setEmail("");
    setAleBaselineDollars("");
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const trimmedOrg = orgName.trim();
    const trimmedSlug = slug.trim();
    const trimmedEmail = email.trim();

    if (trimmedOrg.length < 2 || !trimmedSlug || !trimmedEmail) {
      setError("Complete organization name, workspace slug, and operator email before submitting.");
      setBusy(false);
      return;
    }

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(
      () => controller.abort(),
      90_000,
    );

    try {
      const res = await fetch(`${window.location.origin}/api/register/public-intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          name: trimmedOrg,
          slug: trimmedSlug,
          email: trimmedEmail,
          aleBaselineCents: dollarsToCentsPayload(aleBaselineDollars),
        }),
      });

      const raw = await res.text();
      let data: {
        ok?: boolean;
        success?: boolean;
        error?: string;
        tenantSlug?: string;
        workspaceUrl?: string;
        redirectUrl?: string;
        email?: string;
        partial?: { tenantSlug?: string; workspaceUrl?: string };
      };

      try {
        data = raw.trim() ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        setError(
          res.ok
            ? "Registration returned an invalid response. Restart the dev server and try again."
            : `Registration failed (HTTP ${res.status}). Restart the dev server if this persists.`,
        );
        return;
      }

      if (res.status !== 200 || !data.ok) {
        const partial =
          data.partial?.tenantSlug != null
            ? ` Tenant "${data.partial.tenantSlug}" was created, but the invite step failed.`
            : "";
        setError((data.error ?? "Registration could not be completed.") + partial);
        return;
      }

      if (data.success && data.redirectUrl) {
        window.location.assign(data.redirectUrl);
        return;
      }

      setSubmittedDetails({
        tenantSlug: data.tenantSlug ?? slug.trim(),
        email: data.email ?? email.trim(),
      });
      setIsSubmitted(true);
      resetFormFields();
    } catch (cause) {
      const origin = typeof window !== "undefined" ? window.location.origin : "this site";
      let message: string;
      if (cause instanceof Error && cause.name === "AbortError") {
        message =
          "Request timed out — the server may still be compiling. Wait a moment and try again.";
      } else if (cause instanceof TypeError) {
        message = `Cannot reach the registration API at ${origin}. Start the app with \`npm run dev\` and open ${origin}/register/setup (port must match — usually :3000).`;
      } else if (cause instanceof Error && cause.message) {
        message = cause.message;
      } else {
        message = `Network error — open ${origin}/register/setup with \`npm run dev\` running on the same port.`;
      }
      setError(message);
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      setBusy(false);
    }
  };

  return (
    <main
      className="ironframe-public-registration min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)]"
      aria-labelledby={isSubmitted ? "register-success-title" : "register-setup-title"}
    >
      <nav className="flex items-center justify-between border-b border-[var(--login-border)] px-6 py-4">
        <Link
          href="/marketing"
          className="font-mono text-sm font-bold tracking-tight text-[var(--text-main)] hover:opacity-90"
        >
          IRONFRAME<span className="ml-1 text-xs text-[var(--login-accent)]">GRC</span>
        </Link>
      </nav>

      <div className="mx-auto max-w-lg px-6 py-16">
        {isSubmitted && submittedDetails ? (
          <div
            className="rounded-xl border border-[var(--login-border)] bg-[var(--bg-secondary)]/40 px-8 py-12 text-center"
            role="status"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--login-accent)]">
              Provisioning complete
            </p>
            <h1
              id="register-success-title"
              className="mt-4 text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-3xl"
            >
              Workspace Initialized Securely
            </h1>
            <p className="mt-6 text-sm leading-relaxed text-[var(--login-muted)]">
              We have queued the workspace environment for{" "}
              <span className="font-mono text-[var(--text-main)]">
                {submittedDetails.tenantSlug}
              </span>
              . Please check{" "}
              <span className="font-mono text-[var(--login-accent)]">
                {submittedDetails.email}
              </span>{" "}
              for your secure invitation link to activate your console terminal.
            </p>
          </div>
        ) : (
          <>
            <header className="mb-10 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--login-accent)]">
                Workspace initialization
              </p>
              <h1
                id="register-setup-title"
                className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-3xl"
              >
                Request your secure GRC enclave
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[var(--login-muted)]">
                Tell us where to stand up your isolated tenant. We&apos;ll provision the workspace
                and email your operator invite — no existing console session required.
              </p>
            </header>

            {formReady ? (
              <form
                ref={formRef}
                onSubmit={onSubmit}
                autoComplete="off"
                className="relative space-y-5 rounded-xl border border-[var(--login-border)] bg-[var(--bg-secondary)]/40 p-6"
              >
            {/* Autofill decoys — real fields use non-standard names below */}
            <input
              type="text"
              name="username"
              autoComplete="username"
              tabIndex={-1}
              aria-hidden
              className="pointer-events-none absolute h-0 w-0 opacity-0"
            />
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              tabIndex={-1}
              aria-hidden
              className="pointer-events-none absolute h-0 w-0 opacity-0"
            />

            <RegistrationField label="Organization display name" hint="e.g. Acme Corporation">
              <input
                data-registration-field
                name="ironframe-prospect-org"
                required
                minLength={2}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                autoComplete="off"
                className={fieldClass}
              />
            </RegistrationField>

            <RegistrationField label="Workspace slug" hint="e.g. acmecorp">
              <input
                data-registration-field
                name="ironframe-prospect-slug"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                pattern="[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?"
                autoComplete="off"
                className={fieldClass}
              />
              <span className="mt-1 block font-mono text-[10px] text-[var(--login-muted)]">
                Becomes{" "}
                <span className="text-[var(--login-accent)]">{workspacePreviewUrl}</span>
              </span>
            </RegistrationField>

            <RegistrationField label="Operator email" hint="e.g. ciso@yourcompany.com">
              <input
                data-registration-field
                name="ironframe-prospect-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                className={fieldClass}
              />
            </RegistrationField>

            <RegistrationField
              label="Annualized Loss Expectancy (ALE) Baseline ($)"
              hint="e.g. 2,500,000"
            >
              <input
                data-registration-field
                name="ironframe-prospect-ale-dollars"
                type="text"
                inputMode="numeric"
                value={formatAleDollarsDisplay(aleBaselineDollars)}
                onChange={(e) => setAleBaselineDollars(e.target.value.replace(/\D/g, ""))}
                autoComplete="off"
                className={fieldClass}
                placeholder="2,500,000"
              />
            </RegistrationField>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-[var(--login-accent)] py-3 font-mono text-sm font-bold text-[var(--bg-primary)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Initializing workspace…" : "Initialize security console"}
            </button>

                {error ? (
                  <p
                    className="text-center font-mono text-[11px] text-[var(--login-error)]"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}

                {isPublicRegistrationEnabled() ? (
                  <div className="mt-6 border-t border-slate-800 pt-4 text-center">
                    <p className="text-sm text-slate-400">
                      Just investigating our GRC isolation capabilities?
                    </p>
                    <Link
                      href="/register/demo"
                      className="mt-2 inline-block text-sm font-semibold text-red-400 transition-colors hover:text-red-300"
                    >
                      Launch an instant interactive sandbox →
                    </Link>
                  </div>
                ) : (
                  <div className="mt-6 border-t border-slate-800 pt-4 text-center">
                    <p className="text-sm text-slate-400">
                      Self-serve provisioning is invite-only. Contact sales for a vetted workspace.
                    </p>
                    <Link
                      href={SALES_CONTACT_PATH}
                      className="mt-2 inline-block text-sm font-semibold text-red-400 transition-colors hover:text-red-300"
                    >
                      Request sales-assisted onboarding →
                    </Link>
                  </div>
                )}
              </form>
            ) : (
              <div
                className="space-y-5 rounded-xl border border-[var(--login-border)] bg-[var(--bg-secondary)]/40 p-6"
                aria-hidden
              >
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 w-32 rounded bg-[var(--login-border)]/40" />
                    <div className="h-10 w-full rounded-md border border-[var(--login-border)] bg-[var(--bg-primary)]" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
