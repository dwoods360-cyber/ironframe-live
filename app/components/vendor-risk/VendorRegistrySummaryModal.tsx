"use client";

import GlobalViewportOverlay from "@/app/components/layout/GlobalViewportOverlay";
import type { VendorRegistrySummary } from "@/app/lib/vendorRegistryExport";

type Props = {
  open: boolean;
  onClose: () => void;
  summary: VendorRegistrySummary;
  pilotSeedData?: boolean;
};

export default function VendorRegistrySummaryModal({ open, onClose, summary, pilotSeedData = false }: Props) {
  return (
    <GlobalViewportOverlay
      open={open}
      onClose={onClose}
      ariaLabelledBy="vendor-registry-summary-title"
      panelClassName="w-full max-w-lg overflow-hidden rounded-xl border border-slate-800 bg-slate-950/95 shadow-2xl shadow-black/50"
      backdropClassName="bg-black/55 backdrop-blur-md"
    >
      <div className="border-b border-slate-800 px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-blue-400">
          Supply chain registry
        </p>
        <h2
          id="vendor-registry-summary-title"
          className="mt-1 font-sans text-lg font-bold uppercase tracking-wide text-white"
        >
          Vendor summary
        </h2>
        <p className="mt-2 text-xs text-slate-400">
          Snapshot generated {new Date(summary.exportedAtIso).toLocaleString()}
        </p>
        {pilotSeedData ? (
          <p className="mt-2 text-[11px] leading-relaxed text-amber-200/80">
            Pilot seed registry — metrics compile from MASTER_VENDORS demonstration rows, not your
            tenant vendor table.
          </p>
        ) : null}
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        <MetricCard label="Total vendors" value={summary.totalVendors} />
        <MetricCard label="Active threat intel" value={summary.activeThreatIntel} tone="danger" />
        <MetricCard label="Critical tier" value={summary.byRiskTier.CRITICAL} tone="danger" />
        <MetricCard label="High tier" value={summary.byRiskTier.HIGH} tone="warn" />
        <MetricCard label="Low tier" value={summary.byRiskTier.LOW} />
        <MetricCard label="Overdue renewals" value={summary.overdueRenewals} tone="warn" />
        <MetricCard label="Quarantine candidates" value={summary.quarantineReady} tone="danger" />
      </div>
      <div className="flex justify-end border-t border-slate-800 px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 items-center rounded-lg border border-slate-700 px-5 font-mono text-[10px] font-bold uppercase tracking-wide text-slate-200 transition hover:border-slate-500"
        >
          Close
        </button>
      </div>
    </GlobalViewportOverlay>
  );
}

function MetricCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warn" | "danger";
}) {
  const valueClass =
    tone === "danger"
      ? "text-red-300"
      : tone === "warn"
        ? "text-amber-300"
        : "text-white";

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}
