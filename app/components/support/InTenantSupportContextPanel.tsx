"use client";

import type { InTenantSupportTelemetry } from "@/app/types/inTenantSupportTelemetry";

type InTenantSupportContextPanelProps = {
  telemetry: InTenantSupportTelemetry | null;
  loading?: boolean;
};

function StatusChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`inline-flex h-11 items-center rounded-md border px-3 font-mono text-[10px] uppercase tracking-wider ${
        ok
          ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
          : "border-amber-500/30 bg-amber-950/30 text-amber-200"
      }`}
    >
      {label}
    </span>
  );
}

export default function InTenantSupportContextPanel({
  telemetry,
  loading = false,
}: InTenantSupportContextPanelProps) {
  if (loading) {
    return (
      <div
        className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4"
        data-testid="in-tenant-support-context-panel"
      >
        <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
          Capturing workspace telemetry
        </p>
        <p className="mt-2 text-sm text-slate-400">Binding tenant slug, billing state, and export scope...</p>
      </div>
    );
  }

  if (!telemetry) {
    return (
      <div
        className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4"
        data-testid="in-tenant-support-context-panel"
      >
        <p className="text-sm text-amber-100">
          Workspace telemetry unavailable. Select an active tenant before requesting engineering support.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-4"
      data-testid="in-tenant-support-context-panel"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
            Context-aware support envelope
          </p>
          <p className="mt-1 text-sm text-slate-200">
            Workspace <span className="font-mono text-cyan-200">{telemetry.tenant.slug}</span> — forensic
            telemetry auto-attaches to your request.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusChip
          label={`Billing ${telemetry.billing.status ?? "UNKNOWN"}`}
          ok={telemetry.billing.exportEntitled}
        />
        <StatusChip
          label={telemetry.profileScope.exportScopeReady ? "Export scope ready" : "Export scope missing"}
          ok={telemetry.profileScope.exportScopeReady}
        />
        <StatusChip
          label={telemetry.profileScope.companyProfilePresent ? "Company profile" : "No company profile"}
          ok={telemetry.profileScope.companyProfilePresent}
        />
      </div>

      <dl className="mt-4 grid gap-2 font-mono text-[11px] text-slate-400 sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Tenant UUID</dt>
          <dd className="truncate text-slate-300">{telemetry.tenant.uuid}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Operator</dt>
          <dd className="truncate text-slate-300">{telemetry.operator.email ?? "session-only"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">ALE baseline (cents)</dt>
          <dd className="text-slate-300">{telemetry.profileScope.aleBaselineCents}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Surface / path</dt>
          <dd className="truncate text-slate-300">
            {telemetry.client.surface ?? "support-console"} · {telemetry.client.path ?? "n/a"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Ironguard violations (24h)</dt>
          <dd className="text-slate-300">{telemetry.systemState.recentIronguardViolations}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Diagnostic aborts (24h)</dt>
          <dd className="text-slate-300">{telemetry.systemState.recentDiagnosticAborts}</dd>
        </div>
      </dl>
    </div>
  );
}
