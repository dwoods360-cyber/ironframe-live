"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { supabaseProjectRefFromUrl } from "@/lib/supabase/envPublic";
import { completeWorkspaceInviteLoginAction } from "@/app/actions/register/completeWorkspaceInviteLogin";
import { LOGOUT_IN_FLIGHT_SESSION_KEY } from "@/app/lib/auth/performClientSessionLogout";
import { resolveAuthNextPathForHost } from "@/app/lib/auth/publicAppUrl";
import { buildTenantActivationLandingUrl } from "@/app/lib/auth/workspaceActivationLanding";
import TenantCoBrandBadge from "@/app/components/brand/TenantCoBrandBadge";
import TenantBrandAccent from "@/app/components/brand/TenantBrandAccent";
import PublicApexNav from "@/app/components/marketing/PublicApexNav";
import type { TenantBrand } from "@/app/lib/brand/tenantBrandTypes";
import { resetAllStoresAndTenantScopeCache } from "@/app/utils/purgeClientTenantScope";

type InviteLookupState =
  | {
      ok: true;
      inviteToken: string;
      inviteEmail: string;
      firstTimeRegisterUrl: string;
      activationMode: "existing-account" | "new-account";
    }
  | {
      ok: false;
      inviteError: string;
    };

type Props = {
  initialBrand?: TenantBrand | null;
  inviteState?: InviteLookupState | null;
  inviteTenantSlug?: string | null;
  showApexPublicNav?: boolean;
  /** Preserved from `/login?next=` — post-auth landing after password sign-in. */
  authNextPath?: string | null;
};

export default function LoginClient({
  initialBrand = null,
  inviteState = null,
  inviteTenantSlug = null,
  showApexPublicNav = false,
  authNextPath = null,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const supabaseProjectRef = useMemo(
    () => supabaseProjectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
    [],
  );

  useEffect(() => {
    try {
      if (sessionStorage.getItem(LOGOUT_IN_FLIGHT_SESSION_KEY) !== "1") return;
      sessionStorage.removeItem(LOGOUT_IN_FLIGHT_SESSION_KEY);
    } catch {
      return;
    }
    resetAllStoresAndTenantScopeCache();
  }, []);

  const inviteMode = inviteState?.ok === true;
  const inviteToken = inviteState?.ok ? inviteState.inviteToken : "";
  const firstTimeRegisterUrl = inviteState?.ok ? inviteState.firstTimeRegisterUrl : "";
  const existingAccountInvite = inviteState?.ok
    ? inviteState.activationMode === "existing-account"
    : false;

  const [email, setEmail] = useState(inviteState?.ok ? inviteState.inviteEmail : "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        console.error("Full Auth Details:", signInError);
        if (signInError.message === "Invalid login credentials") {
          setError(
            `Invalid email or password for Supabase project "${supabaseProjectRef ?? "unknown"}". ` +
              "Reset your password via Forgot password below, or update it in Supabase Dashboard → Authentication → Users.",
          );
        } else {
          setError(
            signInError.message ||
              "Database connection failure - check your .env.local file configuration",
          );
        }
        setSubmitting(false);
        return;
      }

      if (inviteMode && inviteToken) {
        await supabase.auth.getSession();
        let activation = await completeWorkspaceInviteLoginAction(inviteToken);
        for (
          let attempt = 0;
          attempt < 3 && !activation.ok && activation.error.includes("Sign in before");
          attempt += 1
        ) {
          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
          await supabase.auth.refreshSession();
          activation = await completeWorkspaceInviteLoginAction(inviteToken);
        }
        if (!activation.ok) {
          setError(activation.error);
          setSubmitting(false);
          return;
        }
        const landing =
          activation.redirectPath ||
          (inviteTenantSlug ? buildTenantActivationLandingUrl(inviteTenantSlug) : null);
        if (!landing) {
          setError("Workspace activation redirect is unavailable. Contact your administrator.");
          setSubmitting(false);
          return;
        }
        window.location.assign(landing);
        return;
      }

      const landing =
        typeof window !== "undefined"
          ? resolveAuthNextPathForHost(window.location.host, authNextPath)
          : "/integrity";
      window.location.assign(landing);
    } catch (signInFailure) {
      console.error("[login] unexpected sign-in failure", signInFailure);
      setError("An unexpected authentication error occurred.");
      setSubmitting(false);
    }
  }

  const isCoBranded = Boolean(initialBrand);

  return (
    <>
      <TenantBrandAccent brand={initialBrand} />
      {showApexPublicNav ? <PublicApexNav loginActive /> : null}
      <main
        className={`ironframe-login-page flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4 transition-colors duration-150 sm:px-6 lg:px-8${showApexPublicNav ? " pt-0" : ""}`}
        aria-labelledby="login-page-title"
      >
        <div
          className="w-full max-w-md space-y-8 rounded-xl border border-[var(--login-border)] bg-[var(--bg-primary)] p-8 shadow-sm"
          style={{ boxShadow: "var(--if-shadow-policy, 0 1px 2px rgba(0,0,0,0.06))" }}
        >
          <header>
            <div className="flex justify-center">
              {isCoBranded ? (
                <TenantCoBrandBadge brand={initialBrand} size="lg" />
              ) : (
                <p
                  className="text-2xl font-bold tracking-tight text-[var(--text-main)]"
                  aria-label="Ironframe Governance, Risk, and Compliance"
                >
                  <span aria-hidden="true">
                    IRONFRAME<span className="ml-1 font-mono text-sm text-[var(--login-accent)]">GRC</span>
                  </span>
                </p>
              )}
            </div>
            <h1
              id="login-page-title"
              className="mt-4 text-center text-xl font-medium tracking-tight text-[var(--text-main)]"
            >
              {inviteMode
                ? "Activate your workspace"
                : isCoBranded
                  ? `Sign in to ${initialBrand!.displayName}`
                  : "Sign in to your security console"}
            </h1>
            <p id="login-page-subtitle" className="mt-2 text-center text-sm text-[var(--login-muted)]">
              {inviteMode
                ? existingAccountInvite
                  ? "This email already has an Ironframe account. Sign in to bind this workspace."
                  : "Sign in with your existing Ironframe credentials to bind this workspace."
                : isCoBranded
                  ? `Dedicated workspace enclave · ALE baseline ${initialBrand!.aleDisplay}`
                  : "Authorized personnel only. Continuous telemetry is active."}
            </p>
          </header>

          <form
            className="mt-8 space-y-6"
            onSubmit={onSubmit}
            aria-describedby="login-page-subtitle"
            aria-busy={submitting}
            noValidate
          >
            {inviteState?.ok === false ? (
              <div
                className="rounded border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-medium text-amber-200"
                role="alert"
              >
                {inviteState.inviteError}
              </div>
            ) : null}

            {error ? (
              <div
                className="rounded border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-500"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <div className="space-y-4 rounded-md">
              <div>
                <label htmlFor="email-address" className="mb-1 block text-xs font-medium text-slate-400">
                  Security Profile Email
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                  required
                  disabled={submitting || inviteMode}
                  readOnly={inviteMode}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="relative block w-full appearance-none rounded-md border border-slate-700 bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                  placeholder="name@company.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-xs font-medium text-slate-400">
                  Account Key / Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    disabled={submitting}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="relative block w-full appearance-none rounded-md border border-slate-700 bg-[var(--bg-primary)] px-3 py-2 pr-10 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-200"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    disabled={submitting}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium font-mono text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting
                ? inviteMode
                  ? "ACTIVATING WORKSPACE..."
                  : "VALIDATING CREDS..."
                : inviteMode
                  ? "Sign in and activate"
                  : "Initialize session"}
            </button>
          </form>

          {inviteMode && firstTimeRegisterUrl && !existingAccountInvite ? (
            <p className="text-center text-sm text-[var(--login-muted)]">
              First time on Ironframe?{" "}
              <Link href={firstTimeRegisterUrl} className="text-emerald-500 hover:text-emerald-400">
                Set up your password
              </Link>
            </p>
          ) : null}

          <p className="text-center text-sm text-[var(--login-muted)]">
            <Link href="/forgot-password" className="text-emerald-500 hover:text-emerald-400">
              Forgot password?
            </Link>
            {isCoBranded && authNextPath ? (
              <>
                {" · "}
                <span className="text-slate-500">
                  After sign-in you will return to{" "}
                  <span className="font-mono text-slate-400">{authNextPath}</span>
                </span>
              </>
            ) : null}
          </p>
          {isCoBranded ? (
            <p className="text-center text-sm text-[var(--login-muted)]">
              <Link
                href="https://ironframegrc.com/marketing"
                className="text-emerald-500 hover:text-emerald-400"
              >
                Platform overview
              </Link>
              {" · "}
              <Link href="/register/contact" className="text-emerald-500 hover:text-emerald-400">
                Contact sales
              </Link>
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}
