"use client";

/**
 * Dashboard header: left-aligned title only — no logo (TAS UI anchor).
 * Tenant label mirrors Command Center (`selectedTenantName`); initial store state is null → `[ PENDING SELECTION ]`
 * until the user selects a tenant (no default seeding).
 */
import { useEffect } from "react";
import { useRiskStore } from "@/app/store/riskStore";
import { useSystemConfigStore, setExpertModeEnabled } from "@/app/store/systemConfigStore";
import { PurgeBoardButton } from "@/app/components/PurgeBoardButton";

export default function Header() {
  const selectedTenantName = useRiskStore((s) => s.selectedTenantName);
  const auditorViewEnabled = useRiskStore((s) => s.auditorViewEnabled);
  const setAuditorViewEnabled = useRiskStore((s) => s.setAuditorViewEnabled);
  const grcDashboardViewMode = useRiskStore((s) => s.grcDashboardViewMode);
  const setGrcDashboardViewMode = useRiskStore((s) => s.setGrcDashboardViewMode);
  const expertModeEnabled = useSystemConfigStore().expertModeEnabled;

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ironframe-grc-dashboard-view");
      if (stored === "executive" || stored === "technical") {
        setGrcDashboardViewMode(stored);
      }
    } catch {
      /* ignore */
    }
  }, [setGrcDashboardViewMode]);

  const executiveView = grcDashboardViewMode === "executive";
  const tenantTitle = selectedTenantName?.trim() || "[ PENDING SELECTION ]";

  return (
    <div
      className="flex w-full flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900/30 px-6 py-3"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      <div className="min-w-0 flex-1 basis-0 text-left">
        <h1 className="text-left text-sm font-bold tracking-wide text-white">
          <span className="uppercase tracking-wider">IRONFRAME V1.0 — </span>
          <span
            className={
              selectedTenantName?.trim()
                ? "font-semibold normal-case tracking-normal text-white"
                : "uppercase tracking-wider text-slate-300"
            }
          >
            {tenantTitle}
          </span>
        </h1>
      </div>

      <div className="flex shrink-0 max-w-full flex-nowrap items-center gap-2 overflow-x-auto sm:ml-auto">
        <div className="flex shrink-0 items-center gap-2">
          <label
            htmlFor="auditor-view-toggle"
            className="text-[11px] font-medium text-slate-400 whitespace-nowrap"
          >
            Auditor view
          </label>
          <button
            id="auditor-view-toggle"
            type="button"
            role="switch"
            aria-checked={auditorViewEnabled}
            onClick={() => setAuditorViewEnabled(!auditorViewEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
              auditorViewEnabled ? "bg-amber-600" : "bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                auditorViewEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-[10px] text-slate-500">{auditorViewEnabled ? "ON" : "OFF"}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label
            htmlFor="cfo-view-toggle"
            className="text-[11px] font-medium text-slate-400 whitespace-nowrap"
          >
            CFO view
          </label>
          <button
            id="cfo-view-toggle"
            type="button"
            role="switch"
            aria-checked={executiveView}
            onClick={() =>
              setGrcDashboardViewMode(executiveView ? "technical" : "executive")
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
              executiveView ? "bg-emerald-600" : "bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                executiveView ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-[10px] text-slate-500">{executiveView ? "Exec" : "Tech"}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
        </div>
        <PurgeBoardButton />
      </div>
    </div>
  );
}
