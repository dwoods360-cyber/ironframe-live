"use client";

import Link from "next/link";

import NavMaturityBadge from "@/app/components/nav/NavMaturityBadge";
import AnalystExportsLink from "@/app/components/nav/AnalystExportsLink";

type Props = {
  title?: string;
  detail?: string;
  compact?: boolean;
};

const DEFAULT_TITLE = "Pilot surface — seed data only";
export const VENDORS_PILOT_SURFACE_DETAIL =
  "This module renders demonstration records from the platform seed corpus (MASTER_VENDORS / sovereign baselines), not your tenant database. CSV exports, ledger stubs, and ellipsis workflow menu items (RFI, map navigation, risk override) are disabled for active workspaces until billing is ACTIVE. Quarantine shields remain active for demonstrations. Tenant-scoped analyst exports live at";
const DEFAULT_DETAIL =  "This module renders demonstration records from the platform seed corpus (MASTER_VENDORS / sovereign baselines), not your tenant database. CSV and ledger exports here are disabled for active workspaces until billing is ACTIVE. Tenant-scoped analyst exports live at /dashboard/exports.";

/** Visible disclosure on stub routes so operators cannot confuse demo UI with production entitlement. */
export default function PilotSurfaceBanner({
  title = DEFAULT_TITLE,
  detail = DEFAULT_DETAIL,
  compact = false,
}: Props) {
  return (
    <div
      className={
        compact
          ? "rounded-lg border border-amber-500/25 bg-amber-950/10 px-3 py-2"
          : "rounded-xl border border-amber-500/30 bg-amber-950/15 px-4 py-4"
      }
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2">
        <NavMaturityBadge label="PILOT" />
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300/95">
          {title}
        </p>
      </div>
      <p className={`text-sm leading-relaxed text-slate-400 ${compact ? "mt-1.5" : "mt-3"}`}>
        {detail}{" "}
        <AnalystExportsLink
          className="text-cyan-300 underline-offset-2 hover:underline"
        >
          Analyst exports
        </AnalystExportsLink>{" "}
        ·{" "}
        <Link href="/get-started" className="text-cyan-300 underline-offset-2 hover:underline">
          Get Started
        </Link>
      </p>
    </div>
  );
}
