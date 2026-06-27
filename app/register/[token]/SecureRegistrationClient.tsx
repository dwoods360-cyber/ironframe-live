"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { activateWorkspaceInvitationAction } from "@/app/actions/register/activateWorkspaceInvitation";
import { buildTenantLoginRedirectUrl } from "@/app/lib/tenantSubdomain";
import { clearShadowPlaneForWorkspaceActivation } from "@/app/store/systemConfigStore";
import { createClient } from "@/lib/supabase/client";

interface SecureRegistrationClientProps {
  token: string;
  targetEmail: string;
  tenantSlug: string | null;
  expiresAt: string;
}

export default function SecureRegistrationClient({
  token,
  targetEmail,
  tenantSlug,
  expiresAt,
}: SecureRegistrationClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msaAccepted, setMsaAccepted] = useState(false);
  const [dpaAccepted, setDpaAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expiresLabel = useMemo(() => {
    try {
      return new Date(expiresAt).toLocaleString();
    } catch {
      return expiresAt;
    }
  }, [expiresAt]);

  useEffect(() => {
    void supabase.auth.signOut({ scope: "local" });
    clearShadowPlaneForWorkspaceActivation();
  }, [supabase]);

  function withWorkspaceActivationMarker(url: string): string {
    try {
      const parsed = new URL(url, window.location.origin);
      if (
        parsed.pathname === "/get-started" ||
        parsed.pathname.startsWith("/get-started/")
      ) {
        parsed.searchParams.set("activation", "1");
      }
      return parsed.toString();
    } catch {
      return url;
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    if (!msaAccepted || !dpaAccepted) {
      setError("MSA and DPA certifications are required.");
      return;
    }

    setBusy(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("token", token);

    const result = await activateWorkspaceInvitationAction(formData);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
    clearShadowPlaneForWorkspaceActivation();

    if (result.sessionHandoffUrl) {
      window.location.assign(result.sessionHandoffUrl);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: result.email,
      password,
    });

    if (signInError) {
      const loginUrl = tenantSlug
        ? new URL(buildTenantLoginRedirectUrl(tenantSlug))
        : new URL("/login", window.location.origin);
      loginUrl.searchParams.set("next", "/get-started");
      loginUrl.searchParams.set("fresh", "1");
      window.location.assign(loginUrl.toString());
      return;
    }

    window.location.assign(withWorkspaceActivationMarker(result.redirectUrl));
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#020617] p-4 text-slate-100 selection:bg-cyan-500/30 sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      <div className="relative z-10 grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-xl border border-slate-800/80 bg-[#070e20]/40 shadow-2xl backdrop-blur-md md:grid-cols-12">
        <div className="flex flex-col justify-between border-b border-slate-800/80 bg-slate-950/50 p-6 sm:p-8 md:col-span-5 md:border-b-0 md:border-r">
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-indigo-400">
              SECURE INGRESS PORTAL
            </div>
            <h1 className="mb-4 font-sans text-xl font-bold tracking-tight text-white">
              Ironframe Workspace Activation
            </h1>
            <p className="font-sans text-xs leading-relaxed text-slate-400">
              You have been provisioned access to an isolated, single-tenant container workspace
              under version{" "}
              <span className="font-mono text-cyan-400">v0.1.0-ga-epic17</span>.
            </p>
          </div>

          <div className="mt-6 space-y-1 border-t border-slate-900 pt-4 font-mono text-[10px] text-slate-500">
            <p>REGISTRATION_MODE: ASSISTED</p>
            <p className="truncate">INVITE_TARGET: {targetEmail}</p>
            {tenantSlug ? <p className="truncate">TENANT_SLUG: {tenantSlug}</p> : null}
            <p className="truncate">INVITE_EXPIRES: {expiresLabel}</p>
            <p className="text-cyan-500/70">● PERIMETER_SHIELD_ACTIVE</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-6 p-6 sm:p-8 md:col-span-7">
          <input type="hidden" name="token" value={token} readOnly />

          <div className="space-y-2">
            <label
              htmlFor="verified-email"
              className="block font-mono text-xs uppercase tracking-wider text-slate-400"
            >
              Verified Operator Email
            </label>
            <input
              id="verified-email"
              type="email"
              disabled
              value={targetEmail}
              readOnly
              className="h-11 w-full cursor-not-allowed rounded-lg border border-slate-800 bg-slate-950/60 px-4 font-mono text-sm text-slate-400 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block font-mono text-xs uppercase tracking-wider text-slate-300"
            >
              Configure Secure Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••••••"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-800 bg-slate-900/50 px-4 font-sans text-sm text-white outline-none transition-all duration-150 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="block font-mono text-xs uppercase tracking-wider text-slate-300"
            >
              Confirm Secure Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••••••"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-800 bg-slate-900/50 px-4 font-sans text-sm text-white outline-none transition-all duration-150 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="space-y-4 border-t border-slate-800/60 pt-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-indigo-400">
              Required Certifications
            </div>

            <label className="group -mx-2 flex cursor-pointer touch-manipulation items-start gap-3 rounded-lg p-2 transition-transform active:scale-[0.99] hover:bg-slate-900/30">
              <div className="flex h-11 w-6 shrink-0 items-center justify-center">
                <input
                  type="checkbox"
                  name="msaAccepted"
                  checked={msaAccepted}
                  onChange={(event) => setMsaAccepted(event.target.checked)}
                  required
                  className="h-5 w-5 cursor-pointer rounded border-slate-800 bg-slate-900 accent-cyan-500 outline-none focus:ring-0 focus:ring-offset-0"
                />
              </div>
              <span className="pt-3 font-sans text-xs leading-normal text-slate-300">
                I attest to and execute the{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  className="font-mono text-cyan-400 underline"
                >
                  Master Services Agreement (MSA)
                </Link>{" "}
                for tenant network mapping.
              </span>
            </label>

            <label className="group -mx-2 flex cursor-pointer touch-manipulation items-start gap-3 rounded-lg p-2 transition-transform active:scale-[0.99] hover:bg-slate-900/30">
              <div className="flex h-11 w-6 shrink-0 items-center justify-center">
                <input
                  type="checkbox"
                  name="dpaAccepted"
                  checked={dpaAccepted}
                  onChange={(event) => setDpaAccepted(event.target.checked)}
                  required
                  className="h-5 w-5 cursor-pointer rounded border-slate-800 bg-slate-900 accent-cyan-500 outline-none focus:ring-0 focus:ring-offset-0"
                />
              </div>
              <span className="pt-3 font-sans text-xs leading-normal text-slate-300">
                I authorize data isolation ingestion rules mapped under the{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="font-mono text-cyan-400 underline"
                >
                  Data Processing Addendum (DPA)
                </Link>
                .
              </span>
            </label>
          </div>

          {error ? (
            <p className="text-xs text-rose-300" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="h-11 w-full touch-manipulation rounded-lg bg-cyan-600 font-sans text-sm font-bold uppercase tracking-wide text-slate-950 shadow-lg shadow-cyan-950/20 transition-all duration-150 hover:bg-cyan-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Activating perimeter…" : "Activate Account Perimeter"}
          </button>
        </form>
      </div>
    </div>
  );
}
