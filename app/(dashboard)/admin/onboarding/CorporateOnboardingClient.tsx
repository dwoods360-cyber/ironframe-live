"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { formatLocalTenantWorkspaceUrl } from "@/app/lib/tenantSubdomain";
import { Building2, KeyRound, Mail, Rocket, UserPlus } from "lucide-react";
import {
  quickProvisionCorporateWorkspaceAction,
  type QuickProvisionCorporateWorkspaceActionResult,
} from "@/app/actions/admin/quickProvisionCorporateWorkspace";
import {
  QuickProvisionProgressPanel,
  advanceQuickProvisionProgress,
  buildInitialQuickProvisionProgress,
  type QuickProvisionProgressState,
} from "@/app/components/onboarding/QuickProvisionProgressPanel";
import {
  provisionCorporateTenantAction,
  type ProvisionCorporateTenantResult,
} from "@/app/actions/admin/provisionCorporateTenant";
import {
  mintWorkspaceInvitationAction,
  type MintWorkspaceInvitationResult,
} from "@/app/actions/admin/mintWorkspaceInvitation";
import {
  inviteCorporateTenantUserAction,
  type InviteCorporateTenantUserResult,
} from "@/app/actions/admin/inviteCorporateTenantUser";
import {
  listProvisionedTenantsForAdminAction,
  type ProvisionedTenantAdminRow,
} from "@/app/actions/admin/listProvisionedTenants";

type ProvisionState = ProvisionCorporateTenantResult | null;
type InviteState = InviteCorporateTenantUserResult | null;
type MintInvitationState = MintWorkspaceInvitationResult | null;
type QuickProvisionState = QuickProvisionCorporateWorkspaceActionResult | null;

export default function CorporateOnboardingClient() {
  const [tenants, setTenants] = useState<ProvisionedTenantAdminRow[]>([]);
  const [tenantsError, setTenantsError] = useState<string | null>(null);
  const [provisionBusy, setProvisionBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [mintBusy, setMintBusy] = useState(false);
  const [provisionResult, setProvisionResult] = useState<ProvisionState>(null);
  const [inviteResult, setInviteResult] = useState<InviteState>(null);
  const [mintResult, setMintResult] = useState<MintInvitationState>(null);
  const [quickBusy, setQuickBusy] = useState(false);
  const [quickResult, setQuickResult] = useState<QuickProvisionState>(null);
  const [quickProgress, setQuickProgress] = useState<QuickProvisionProgressState | null>(null);
  const [inviteTenantSlug, setInviteTenantSlug] = useState("");

  const refreshTenants = useCallback(async () => {
    const res = await listProvisionedTenantsForAdminAction();
    if (!res.ok) {
      setTenantsError(res.error);
      setTenants([]);
      return;
    }
    setTenantsError(null);
    setTenants(res.tenants);
    if (res.tenants.length > 0 && !inviteTenantSlug) {
      setInviteTenantSlug(res.tenants[res.tenants.length - 1]!.slug);
    }
  }, [inviteTenantSlug]);

  useEffect(() => {
    void refreshTenants();
  }, [refreshTenants]);

  const onProvision = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProvisionBusy(true);
    setProvisionResult(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await provisionCorporateTenantAction(fd);
    setProvisionBusy(false);
    setProvisionResult(res);
    if (res.ok) {
      form.reset();
      setInviteTenantSlug(res.slug);
      void refreshTenants();
    }
  };

  const onInvite = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInviteBusy(true);
    setInviteResult(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("tenantSlug", inviteTenantSlug);
    const res = await inviteCorporateTenantUserAction(fd);
    setInviteBusy(false);
    setInviteResult(res);
    if (res.ok) {
      form.reset();
    }
  };

  const onMintInvitation = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMintBusy(true);
    setMintResult(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await mintWorkspaceInvitationAction(fd);
    setMintBusy(false);
    setMintResult(res);
    if (res.ok) {
      form.reset();
    }
  };

  const onQuickProvision = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setQuickBusy(true);
    setQuickResult(null);
    setQuickProgress(buildInitialQuickProvisionProgress());

    const form = e.currentTarget;
    const fd = new FormData(form);
    const tenantStageTimer = window.setTimeout(() => {
      setQuickProgress((current) =>
        current ? advanceQuickProvisionProgress(current, 1) : current,
      );
    }, 800);

    const res = await quickProvisionCorporateWorkspaceAction(fd);
    window.clearTimeout(tenantStageTimer);
    setQuickProgress((current) =>
      current ? advanceQuickProvisionProgress(current, 2) : current,
    );
    setQuickBusy(false);
    setQuickResult(res);
    if (res.ok) {
      form.reset();
      setInviteTenantSlug(res.slug);
      void refreshTenants();
    }
    window.setTimeout(() => setQuickProgress(null), 2000);
  };

  const supabaseRedirectHint = (slug: string) => `${formatLocalTenantWorkspaceUrl(slug, 3000)}/**`;

  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#070e20]/30 p-4 sm:p-6">
      <header className="mb-6 max-w-3xl">
        <h2 className="font-mono text-[11px] font-black uppercase tracking-widest text-emerald-200">
          Provisioning controls
        </h2>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          Mint invitation tokens, provision B2B workspaces, and invite corporate operators. Requires
          GLOBAL_ADMIN (or platform constitutional authority in dev).
        </p>
      </header>

      <div className="grid max-w-3xl gap-6 lg:grid-cols-2">
        <section className="rounded border border-violet-800/50 bg-slate-900/50 p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-violet-400" aria-hidden />
            <h2 className="text-[11px] font-black uppercase tracking-widest text-violet-200">
              0 — Mint invitation token
            </h2>
          </div>
          <p className="mb-4 text-[10px] leading-relaxed text-slate-400">
            Sales-assisted and Stripe checkout provisioning require an active admin invitation token
            that matches database state. Tokens are hashed at rest; copy the plaintext once.
          </p>
          <form onSubmit={onMintInvitation} className="grid gap-3 sm:grid-cols-3">
            <label className="block text-[10px] text-slate-400">
              Bound email (optional)
              <input
                name="email"
                type="email"
                className="mt-1 w-full rounded border border-slate-700 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-slate-100"
                placeholder="ciso@customer.com"
              />
            </label>
            <label className="block text-[10px] text-slate-400">
              Bound slug (optional)
              <input
                name="tenantSlug"
                pattern="[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?"
                className="mt-1 w-full rounded border border-slate-700 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-slate-100"
                placeholder="acmecorp"
              />
            </label>
            <label className="block text-[10px] text-slate-400">
              TTL (days)
              <input
                name="ttlDays"
                type="number"
                min={1}
                max={90}
                defaultValue={14}
                className="mt-1 w-full rounded border border-slate-700 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-slate-100"
              />
            </label>
            <button
              type="submit"
              disabled={mintBusy}
              className="sm:col-span-3 rounded border border-violet-600/70 bg-violet-950/40 py-2 text-[10px] font-black uppercase text-violet-200 disabled:opacity-40"
            >
              {mintBusy ? "Minting…" : "Generate invitation token"}
            </button>
          </form>
          {mintResult && !mintResult.ok ? (
            <p className="mt-3 text-[10px] text-rose-300" role="alert">
              {mintResult.error}
            </p>
          ) : null}
          {mintResult?.ok ? (
            <div
              className="mt-4 rounded border border-violet-700/40 bg-violet-950/30 p-3 text-[10px] text-violet-100"
              role="status"
            >
              <p className="font-bold uppercase tracking-wide">Invitation minted</p>
              <p className="mt-2 text-slate-400">Plaintext token (single display):</p>
              <code className="mt-1 block break-all rounded bg-black/40 px-2 py-1 font-mono text-[9px] text-violet-200">
                {mintResult.token}
              </code>
              <p className="mt-2 font-mono text-[9px] text-slate-500">
                expires {mintResult.expiresAt}
              </p>
              <p className="mt-2 text-slate-400">Secure activation URL:</p>
              <code className="mt-1 block break-all rounded bg-black/40 px-2 py-1 font-mono text-[9px] text-violet-200">
                /register/{mintResult.token}
              </code>
            </div>
          ) : null}
        </section>

        <section className="rounded border border-cyan-800/50 bg-slate-900/50 p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Rocket className="h-4 w-4 text-cyan-400" aria-hidden />
            <h2 className="text-[11px] font-black uppercase tracking-widest text-cyan-200">
              Quick provision — tenant + activation invite
            </h2>
          </div>
          <p className="mb-4 text-[10px] leading-relaxed text-slate-400">
            One-shot design-partner path: creates the tenant, mints a register token, and sends the
            welcome email. Operator completes ALE + company profile on Get Started after activation.
          </p>

          {quickProgress ? (
            <div className="mb-4">
              <QuickProvisionProgressPanel
                progress={quickProgress}
                onTick={setQuickProgress}
              />
            </div>
          ) : null}

          <form onSubmit={onQuickProvision} className="grid gap-3 sm:grid-cols-3">
            <label className="block text-[10px] text-slate-400">
              Business display name
              <input
                name="name"
                required
                minLength={2}
                disabled={quickBusy}
                className="mt-1 h-11 w-full rounded border border-slate-700 bg-black/40 px-2 font-mono text-[11px] text-slate-100"
                placeholder="Acme Corporation"
              />
            </label>
            <label className="block text-[10px] text-slate-400">
              Workspace slug
              <input
                name="slug"
                required
                pattern="[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?"
                disabled={quickBusy}
                className="mt-1 h-11 w-full rounded border border-slate-700 bg-black/40 px-2 font-mono text-[11px] text-slate-100"
                placeholder="acmecorp"
              />
            </label>
            <label className="block text-[10px] text-slate-400">
              Operator email
              <input
                name="email"
                type="email"
                required
                disabled={quickBusy}
                className="mt-1 h-11 w-full rounded border border-slate-700 bg-black/40 px-2 font-mono text-[11px] text-slate-100"
                placeholder="ciso@customer.com"
              />
            </label>
            <button
              type="submit"
              disabled={quickBusy}
              className="sm:col-span-3 inline-flex h-11 items-center justify-center rounded border border-cyan-600/70 bg-cyan-950/40 text-[10px] font-black uppercase text-cyan-200 disabled:opacity-40"
            >
              {quickBusy ? "Provisioning…" : "Quick provision workspace"}
            </button>
          </form>

          {quickResult && !quickResult.ok ? (
            <p className="mt-3 text-[10px] text-rose-300" role="alert">
              {quickResult.error}
            </p>
          ) : null}

          {quickResult?.ok ? (
            <div
              className="mt-4 rounded border border-cyan-700/40 bg-cyan-950/30 p-3 text-[10px] text-cyan-100"
              role="status"
            >
              <p className="font-bold uppercase tracking-wide">
                {quickResult.tenantAlreadyExisted ? "Invitation minted" : "Workspace provisioned"}
              </p>
              <p className="mt-1 font-mono text-[9px] text-cyan-200/90">{quickResult.workspaceUrl}</p>
              <p className="mt-2 text-slate-400">Secure activation URL:</p>
              <code className="mt-1 block break-all rounded bg-black/40 px-2 py-1 font-mono text-[9px] text-cyan-200">
                {quickResult.registerUrl}
              </code>
              {quickResult.inviteEmail && !quickResult.inviteEmail.sent ? (
                <p className="mt-2 text-amber-200" role="alert">
                  Email not sent: {quickResult.inviteEmail.error ?? "delivery failed"}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="rounded border border-emerald-800/50 bg-slate-900/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-400" aria-hidden />
            <h2 className="text-[11px] font-black uppercase tracking-widest text-emerald-200">
              1 — Provision tenant
            </h2>
          </div>
          <p className="mb-4 text-[10px] leading-relaxed text-slate-400">
            Creates a row in <code className="text-slate-300">tenants</code> and invalidates slug
            cache so middleware can resolve the subdomain immediately.
          </p>

          <form onSubmit={onProvision} className="space-y-3">
            <label className="block text-[10px] text-slate-400">
              Display name
              <input
                name="name"
                required
                minLength={2}
                className="mt-1 w-full rounded border border-slate-700 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-slate-100"
                placeholder="Acme Corporation"
              />
            </label>
            <label className="block text-[10px] text-slate-400">
              Workspace slug (subdomain)
              <input
                name="slug"
                required
                pattern="[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?"
                className="mt-1 w-full rounded border border-slate-700 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-slate-100"
                placeholder="acmecorp"
              />
            </label>
            <label className="block text-[10px] text-slate-400">
              Industry (optional)
              <input
                name="industry"
                className="mt-1 w-full rounded border border-slate-700 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-slate-100"
                placeholder="Financial Services"
              />
            </label>
            <label className="block text-[10px] text-slate-400">
              ALE baseline (cents)
              <input
                name="aleBaselineCents"
                type="number"
                min={0}
                step={1}
                defaultValue={0}
                className="mt-1 w-full rounded border border-slate-700 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-slate-100"
              />
            </label>
            <button
              type="submit"
              disabled={provisionBusy}
              className="w-full rounded border border-emerald-600/70 bg-emerald-950/40 py-2 text-[10px] font-black uppercase text-emerald-200 disabled:opacity-40"
            >
              {provisionBusy ? "Provisioning…" : "Create workspace"}
            </button>
          </form>

          {provisionResult && !provisionResult.ok ? (
            <p className="mt-3 text-[10px] text-rose-300" role="alert">
              {provisionResult.error}
            </p>
          ) : null}

          {provisionResult?.ok ? (
            <div
              className="mt-4 rounded border border-emerald-700/40 bg-emerald-950/30 p-3 text-[10px] text-emerald-100"
              role="status"
            >
              <p className="font-bold uppercase tracking-wide">Workspace ready</p>
              <p className="mt-1 font-mono text-[9px] text-emerald-200/90">
                {provisionResult.workspaceUrl}
              </p>
              <p className="mt-2 text-slate-400">
                Add to Supabase Auth → URL Configuration → Redirect URLs:
              </p>
              <code className="mt-1 block break-all rounded bg-black/40 px-2 py-1 font-mono text-[9px] text-cyan-200">
                {supabaseRedirectHint(provisionResult.slug)}
              </code>
            </div>
          ) : null}
        </section>

        <section className="rounded border border-sky-800/50 bg-slate-900/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-sky-400" aria-hidden />
            <h2 className="text-[11px] font-black uppercase tracking-widest text-sky-200">
              2 — Invite operator
            </h2>
          </div>
          <p className="mb-4 text-[10px] leading-relaxed text-slate-400">
            Sends a Supabase invite with tenant metadata and pre-assigns{" "}
            <code className="text-slate-300">user_role_assignments</code> for the workspace.
            Requires <code className="text-slate-300">SUPABASE_SERVICE_ROLE_KEY</code>.
          </p>

          {tenantsError ? (
            <p className="mb-3 text-[10px] text-rose-300" role="alert">
              {tenantsError}
            </p>
          ) : null}

          <form onSubmit={onInvite} className="space-y-3">
            <label className="block text-[10px] text-slate-400">
              Email
              <input
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded border border-slate-700 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-slate-100"
                placeholder="ciso@customer.com"
              />
            </label>
            <label className="block text-[10px] text-slate-400">
              Tenant workspace
              <select
                value={inviteTenantSlug}
                onChange={(ev) => setInviteTenantSlug(ev.target.value)}
                required
                className="mt-1 w-full rounded border border-slate-700 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-slate-100"
              >
                <option value="" disabled>
                  {tenants.length === 0 ? "Provision a tenant first" : "Select tenant…"}
                </option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.name} ({t.slug})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] text-slate-400">
              Initial role
              <select
                name="role"
                defaultValue="GRC_MANAGER"
                className="mt-1 w-full rounded border border-slate-700 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-slate-100"
              >
                <option value="GRC_MANAGER">GRC Manager</option>
                <option value="CISO">CISO</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={inviteBusy || tenants.length === 0 || !inviteTenantSlug}
              className="w-full rounded border border-sky-600/70 bg-sky-950/40 py-2 text-[10px] font-black uppercase text-sky-200 disabled:opacity-40"
            >
              {inviteBusy ? "Sending invite…" : "Send invite"}
            </button>
          </form>

          {inviteResult && !inviteResult.ok ? (
            <p className="mt-3 text-[10px] text-rose-300" role="alert">
              {inviteResult.error}
            </p>
          ) : null}

          {inviteResult?.ok ? (
            <div
              className="mt-4 rounded border border-sky-700/40 bg-sky-950/30 p-3 text-[10px] text-sky-100"
              role="status"
            >
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" aria-hidden />
                <p className="font-bold uppercase tracking-wide">Invite sent</p>
              </div>
              <p className="mt-1">
                {inviteResult.email} → <span className="font-mono">{inviteResult.tenantSlug}</span>
              </p>
              <p className="mt-2 font-mono text-[9px] text-sky-200/90">{inviteResult.workspaceUrl}</p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
