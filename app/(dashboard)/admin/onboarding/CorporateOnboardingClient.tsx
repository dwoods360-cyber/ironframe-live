"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatLocalTenantWorkspaceUrl } from "@/app/lib/tenantSubdomain";
import { Building2, Mail, UserPlus } from "lucide-react";
import {
  provisionCorporateTenantAction,
  type ProvisionCorporateTenantResult,
} from "@/app/actions/admin/provisionCorporateTenant";
import {
  inviteCorporateTenantUserAction,
  type InviteCorporateTenantUserResult,
} from "@/app/actions/admin/inviteCorporateTenantUser";
import {
  listProvisionedTenantsForAdminAction,
  type ProvisionedTenantAdminRow,
} from "@/app/actions/admin/listProvisionedTenants";
import { setTenantBillingStatusAction } from "@/app/actions/admin/setTenantBillingStatus";
import { TENANT_BILLING_STATUS } from "@/app/lib/billing/constants";

type ProvisionState = ProvisionCorporateTenantResult | null;
type InviteState = InviteCorporateTenantUserResult | null;

export default function CorporateOnboardingClient() {
  const [tenants, setTenants] = useState<ProvisionedTenantAdminRow[]>([]);
  const [tenantsError, setTenantsError] = useState<string | null>(null);
  const [provisionBusy, setProvisionBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [provisionResult, setProvisionResult] = useState<ProvisionState>(null);
  const [inviteResult, setInviteResult] = useState<InviteState>(null);
  const [inviteTenantSlug, setInviteTenantSlug] = useState("");
  const [billingBusySlug, setBillingBusySlug] = useState<string | null>(null);

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

  const onActivateBilling = async (slug: string) => {
    setBillingBusySlug(slug);
    const res = await setTenantBillingStatusAction(slug, TENANT_BILLING_STATUS.ACTIVE);
    setBillingBusySlug(null);
    if (res.ok) {
      void refreshTenants();
    }
  };

  const supabaseRedirectHint = (slug: string) => `${formatLocalTenantWorkspaceUrl(slug, 3000)}/**`;

  return (
    <div className="min-h-full bg-[#050509] p-6 text-slate-200">
      <p className="mb-4 text-[10px] text-slate-500">
        <Link href="/settings/config" className="text-cyan-400 hover:underline">
          ← System configuration
        </Link>
      </p>

      <header className="mb-6 max-w-3xl">
        <h1 className="text-sm font-black uppercase tracking-widest text-emerald-200">
          Corporate client onboarding
        </h1>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          Provision a B2B workspace on its tenant subdomain, then invite the customer&apos;s first
          operator. Requires GLOBAL_ADMIN (or platform constitutional authority in dev).
        </p>
        <p className="mt-2 text-[10px]">
          <Link href="/admin/onboarding/test-assets" className="text-cyan-400 hover:underline">
            Acme Corp ingestion test PDF suite →
          </Link>
        </p>
      </header>

      <div className="grid max-w-3xl gap-6 lg:grid-cols-2">
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

      {tenants.length > 0 ? (
        <section className="mt-8 max-w-3xl rounded border border-slate-800 bg-slate-900/30 p-4">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-300">
            Provisioned workspaces ({tenants.length})
          </h2>
          <ul className="mt-3 divide-y divide-slate-800">
            {tenants.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[10px]">
                <div>
                  <span className="font-medium text-slate-200">{t.name}</span>
                  <p className="mt-1 font-mono text-[9px] text-slate-500">
                    billing: {t.billingStatus ?? "UNTRACKED"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={t.workspaceUrl}
                    className="font-mono text-cyan-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {formatLocalTenantWorkspaceUrl(t.slug, 3000).replace(/^https?:\/\//, "")}
                  </a>
                  {t.billingStatus !== TENANT_BILLING_STATUS.ACTIVE ? (
                    <button
                      type="button"
                      disabled={billingBusySlug === t.slug}
                      onClick={() => void onActivateBilling(t.slug)}
                      className="rounded border border-amber-600/60 bg-amber-950/40 px-2 py-1 font-mono text-[9px] uppercase text-amber-200 disabled:opacity-40"
                    >
                      {billingBusySlug === t.slug ? "…" : "Activate billing"}
                    </button>
                  ) : (
                    <span className="font-mono text-[9px] uppercase text-emerald-400">Active</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
