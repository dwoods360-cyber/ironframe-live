"use client";

/**
 * Dashboard header: Tenant Selection dropdown next to Protected Tenants.
 * Expert Mode toggle: show/hide audit stream and full risk exposure (default ON for QA).
 * Audit Trail link and Purge simulation button.
 */
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { purgeSimulation } from "@/app/actions/purgeSimulation";
import { clearAllAuditLogs } from "@/app/utils/auditLogger";
import { useKimbotStore } from "@/app/store/kimbotStore";
import { useGrcBotStore } from "@/app/store/grcBotStore";
import { useRiskStore } from "@/app/store/riskStore";
import { useAgentStore } from "@/app/store/agentStore";
import { useSystemConfigStore, setExpertModeEnabled } from "@/app/store/systemConfigStore";
import { sleepBlueTeam } from "@/app/utils/blueTeamSync";

const CONSULTANT_TENANT_OPTIONS = [
  "MedShield Clinic",
  "St. Jude Hospital",
  "Medshield Health",
  "Vaultbank Global",
  "Gridcore Energy",
];

type HeaderProps = {
  /** Additional tenant names from server (e.g. company names). Merged with consultant options. */
  tenantNames?: string[];
};

export default function Header({ tenantNames = [] }: HeaderProps) {
  const router = useRouter();
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const selectedTenantName = useRiskStore((s) => s.selectedTenantName);
  const setSelectedTenantName = useRiskStore((s) => s.setSelectedTenantName);
  const expertModeEnabled = useSystemConfigStore().expertModeEnabled;
  const [purging, setPurging] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  const options = [
    "",
    ...new Set([...CONSULTANT_TENANT_OPTIONS, ...tenantNames].filter(Boolean)),
  ];

  const handlePurge = async () => {
    if (purging) return;
    setPurging(true);
    try {
      const result = await purgeSimulation();
      if (result.ok) {
        clearAllAuditLogs();
        useKimbotStore.getState().resetSimulationCounters();
        useGrcBotStore.getState().stop();
        useRiskStore.getState().clearAllRiskStateForPurge();
        useRiskStore.getState().setSelectedThreatId(null);
        useAgentStore.getState().addStreamMessage("> [SYSTEM] Simulation environment wiped. System status: CLEAN.");
        sleepBlueTeam();
      }
      setShowPurgeConfirm(false);
      router.refresh();
    } finally {
      setPurging(false);
    }
  };

  return (
    <div
      className="flex items-center gap-4 border-b border-slate-800 bg-slate-900/30 px-6 py-3"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* # HEADER_TITLE — Playwright E2E expects this exact text (Iteration 3.1) */}
      <h1 className="text-sm font-bold uppercase tracking-wider text-white shrink-0">
        EMERGENCY CLICK TEST
      </h1>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
        Protected Tenants ({selectedIndustry})
      </span>
      <select
        value={selectedTenantName ?? ""}
        onChange={(e) => setSelectedTenantName(e.target.value || null)}
        className="rounded border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-[8.5px] font-medium text-slate-200 outline-none focus:border-blue-500"
        aria-label="Tenant selection"
      >
        <option value="">My Organization</option>
        {options.filter((v) => v !== "").map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <Link
        href="/reports/audit-trail"
        className="rounded border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-[11px] font-medium text-slate-200 outline-none hover:border-blue-500 hover:text-white"
      >
        Audit Trail
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <label
          htmlFor="expert-mode-toggle"
          className="text-[11px] font-medium text-slate-400 whitespace-nowrap"
        >
          Expert Mode
        </label>
        <button
          id="expert-mode-toggle"
          type="button"
          role="switch"
          aria-checked={expertModeEnabled}
          onClick={() => setExpertModeEnabled(!expertModeEnabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
            expertModeEnabled ? "bg-blue-600" : "bg-slate-700"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
              expertModeEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className="text-[10px] text-slate-500">
          {expertModeEnabled ? "ON" : "OFF"}
        </span>
        {showPurgeConfirm ? (
          <div className="flex items-center gap-2 rounded border border-slate-600 bg-slate-900/90 px-2 py-1">
            <span className="text-[10px] text-slate-300">Purge simulation?</span>
            <button
              type="button"
              onClick={handlePurge}
              disabled={purging}
              className="rounded border border-rose-500/60 bg-rose-500/20 px-2 py-1 text-[10px] font-bold uppercase text-rose-300 hover:bg-rose-500/30 disabled:opacity-50"
            >
              {purging ? "…" : "Yes"}
            </button>
            <button
              type="button"
              onClick={() => setShowPurgeConfirm(false)}
              disabled={purging}
              className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase text-slate-300 hover:bg-slate-700"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPurgeConfirm(true)}
            disabled={purging}
            className="rounded border border-rose-500/60 bg-rose-500/10 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
          >
            Purge
          </button>
        )}
      </div>
    </div>
  );
}
