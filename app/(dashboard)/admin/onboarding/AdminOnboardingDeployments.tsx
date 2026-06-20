import Link from "next/link";

import type { TenantDeploymentRow } from "@/app/lib/server/adminOnboardingDeployments";

function infrastructureBadgeClass(status: TenantDeploymentRow["infrastructureStatus"]): string {
  if (status === "PROVISIONED") {
    return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  }
  return "border border-amber-500/20 bg-amber-500/10 text-amber-400";
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
        <div className="grid grid-cols-12 gap-4 border-b border-slate-800 bg-slate-950/60 px-6 py-3.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400">
          <div className="col-span-2">Tenant ID</div>
          <div className="col-span-3">Organization</div>
          <div className="col-span-2 text-right">ALE Target Allocation</div>
          <div className="col-span-2 text-center">Infrastructure</div>
          <div className="col-span-2 text-center">Legal Posture</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        <div className="divide-y divide-slate-800/50">
          {deployments.map((tenant) => (
            <div
              key={tenant.tenantUuid}
              className="grid grid-cols-12 items-center gap-4 px-6 py-4 font-sans text-sm text-slate-300 transition-colors duration-150 hover:bg-slate-900/20"
            >
              <div className="col-span-2 font-mono text-xs text-slate-500">{tenant.id}</div>
              <div className="col-span-3 font-semibold text-white">{tenant.company}</div>
              <div className="col-span-2 text-right font-mono text-xs text-indigo-300">
                {tenant.allocatedBaseline}
              </div>
              <div className="col-span-2 text-center">
                <span
                  className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] font-bold ${infrastructureBadgeClass(tenant.infrastructureStatus)}`}
                >
                  {tenant.infrastructureStatus}
                </span>
              </div>
              <div className="col-span-2 text-center text-xs text-slate-400">{tenant.legalSignoff}</div>
              <div className="col-span-1 flex justify-end gap-2">
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
                className={`rounded px-2 py-0.5 font-mono text-[9px] font-bold ${infrastructureBadgeClass(tenant.infrastructureStatus)}`}
              >
                {tenant.infrastructureStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-y-2 font-mono text-[11px] leading-relaxed">
              <div className="text-slate-500">ALE PROTECTION:</div>
              <div className="text-right font-bold text-indigo-300">{tenant.allocatedBaseline}</div>
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
