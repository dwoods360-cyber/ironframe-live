import Link from "next/link";

import type { TenantDeploymentRow } from "@/app/lib/server/adminOnboardingDeployments";

function infrastructureBadgeClass(status: TenantDeploymentRow["infrastructureStatus"]): string {
  if (status === "PROVISIONED") {
    return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  }
  return "border border-amber-500/20 bg-amber-500/10 text-amber-400";
}

function billingBadgeClass(status: TenantDeploymentRow["billingStatus"]): string {
  if (status === "ACTIVE") {
    return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  }
  if (status === "PAST_DUE") {
    return "border border-rose-500/20 bg-rose-500/10 text-rose-400";
  }
  if (status === "PENDING") {
    return "border border-amber-500/20 bg-amber-500/10 text-amber-400";
  }
  return "border border-slate-700 bg-slate-900/60 text-slate-500";
}

function formatOperatorEmails(emails: string[]): string {
  if (emails.length === 0) return "—";
  if (emails.length === 1) return emails[0];
  return `${emails[0]} +${emails.length - 1}`;
}

function DeploymentRowActions({ tenant }: { tenant: TenantDeploymentRow }) {
  return (
    <div className="flex gap-3 pt-2">
      <Link
        href="#onboarding-controls"
        className="flex h-11 flex-1 touch-manipulation items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 font-sans text-xs font-semibold uppercase tracking-wide text-slate-300 transition-colors hover:bg-slate-900 active:scale-[0.98]"
      >
        View Token
      </Link>
      <a
        href={tenant.workspaceUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${tenant.company} workspace`}
        className="flex h-11 touch-manipulation items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 px-4 font-mono text-sm text-slate-400 transition-colors hover:text-white active:scale-[0.98]"
      >
        ⚙️
      </a>
    </div>
  );
}

interface AdminOnboardingDeploymentsProps {
  deployments: TenantDeploymentRow[];
}

export default function AdminOnboardingDeployments({ deployments }: AdminOnboardingDeploymentsProps) {
  if (deployments.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800/80 bg-[#070e20]/40 p-8 text-center shadow-2xl backdrop-blur-md">
        <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
          No tenant deployments yet
        </p>
        <p className="mt-2 font-sans text-sm text-slate-400">
          Mint an invitation token and provision your first workspace below.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-slate-800/80 bg-[#070e20]/40 shadow-2xl backdrop-blur-md md:block">
        <div className="grid grid-cols-12 gap-3 border-b border-slate-800 bg-slate-950/60 px-6 py-3.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400">
          <div className="col-span-1">Tenant ID</div>
          <div className="col-span-2">Organization</div>
          <div className="col-span-2">Invite Email</div>
          <div className="col-span-2">Activated Operator</div>
          <div className="col-span-1 text-center">Billing</div>
          <div className="col-span-1 text-right">ALE Target</div>
          <div className="col-span-1 text-center">Infra</div>
          <div className="col-span-1 text-center">Legal</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        <div className="divide-y divide-slate-800/50">
          {deployments.map((tenant) => (
            <div
              key={tenant.tenantUuid}
              className="grid grid-cols-12 items-center gap-3 px-6 py-4 font-sans text-sm text-slate-300 transition-colors duration-150 hover:bg-slate-900/20"
            >
              <div className="col-span-1 font-mono text-[10px] text-slate-500">{tenant.id}</div>
              <div className="col-span-2 font-semibold text-white">{tenant.company}</div>
              <div className="col-span-2 min-w-0">
                <p className="truncate text-xs text-slate-200" title={tenant.inviteEmail ?? undefined}>
                  {tenant.inviteEmail ?? "—"}
                </p>
                {tenant.inviteStatus ? (
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wide text-slate-500">
                    {tenant.inviteStatus}
                  </p>
                ) : null}
              </div>
              <div className="col-span-2 min-w-0">
                <p
                  className="truncate text-xs text-cyan-300"
                  title={tenant.activatedOperatorEmails.join(", ") || undefined}
                >
                  {formatOperatorEmails(tenant.activatedOperatorEmails)}
                </p>
              </div>
              <div className="col-span-1 text-center">
                <span
                  className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] font-bold ${billingBadgeClass(tenant.billingStatus)}`}
                >
                  {tenant.billingStatus ?? "NONE"}
                </span>
              </div>
              <div className="col-span-1 text-right font-mono text-[10px] text-indigo-300">
                {tenant.allocatedBaseline}
              </div>
              <div className="col-span-1 text-center">
                <span
                  className={`inline-block rounded px-2 py-0.5 font-mono text-[9px] font-bold ${infrastructureBadgeClass(tenant.infrastructureStatus)}`}
                >
                  {tenant.infrastructureStatus}
                </span>
              </div>
              <div className="col-span-1 text-center text-[10px] text-slate-400">{tenant.legalSignoff}</div>
              <div className="col-span-1 flex justify-end">
                <Link
                  href="#onboarding-controls"
                  title={`Invite ref ${tenant.tokenLabel}`}
                  className="inline-flex h-11 min-w-11 touch-manipulation items-center justify-center rounded border border-slate-800 bg-slate-900 px-2 font-mono text-[10px] text-slate-400 transition-transform hover:border-slate-700 hover:text-white active:scale-95"
                >
                  {tenant.tokenLabel}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 md:hidden">
        {deployments.map((tenant) => (
          <div
            key={tenant.tenantUuid}
            className="relative space-y-4 rounded-xl border border-slate-800/80 bg-[#070e20]/40 p-5 shadow-xl backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-white">{tenant.company}</h3>
                <p className="mt-0.5 font-mono text-[10px] text-slate-500">ID: {tenant.id}</p>
              </div>
              <span
                className={`rounded px-2 py-0.5 font-mono text-[9px] font-bold ${billingBadgeClass(tenant.billingStatus)}`}
              >
                {tenant.billingStatus ?? "NONE"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-y-2 font-mono text-[11px] leading-relaxed">
              <div className="text-slate-500">INVITE EMAIL:</div>
              <div className="truncate text-right text-slate-200" title={tenant.inviteEmail ?? undefined}>
                {tenant.inviteEmail ?? "—"}
              </div>
              <div className="text-slate-500">ACTIVATED OPERATOR:</div>
              <div
                className="truncate text-right text-cyan-300"
                title={tenant.activatedOperatorEmails.join(", ") || undefined}
              >
                {formatOperatorEmails(tenant.activatedOperatorEmails)}
              </div>
              <div className="text-slate-500">ALE PROTECTION:</div>
              <div className="text-right font-bold text-indigo-300">{tenant.allocatedBaseline}</div>
              <div className="text-slate-500">INFRASTRUCTURE:</div>
              <div className="text-right text-slate-400">{tenant.infrastructureStatus}</div>
              <div className="text-slate-500">LEGAL COMPLIANCE:</div>
              <div className="text-right text-slate-400">{tenant.legalSignoff}</div>
              <div className="text-slate-500">INVITE REF:</div>
              <div className="text-right text-cyan-400">{tenant.tokenLabel}</div>
            </div>

            <DeploymentRowActions tenant={tenant} />
          </div>
        ))}
      </div>
    </>
  );
}
