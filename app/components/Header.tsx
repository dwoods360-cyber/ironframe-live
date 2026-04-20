"use client";

/**
 * Dashboard header: production title strip with tenant label and controls.
 */
import { useRiskStore } from "@/app/store/riskStore";
import { useSystemConfigStore, setExpertModeEnabled } from "@/app/store/systemConfigStore";
import { IronframeHexMark } from "@/app/components/IronframeHexMark";
import { PurgeBoardButton } from "@/app/components/PurgeBoardButton";

const CONSULTANT_TENANT_OPTIONS = [
  "MedShield Clinic",
  "St. Jude Hospital",
  "Medshield Health",
  "Vaultbank Global",
  "Gridcore Energy",
];

type HeaderProps = {
  tenantNames?: string[];
};

export default function Header({ tenantNames = [] }: HeaderProps) {
  const selectedTenantName = useRiskStore((s) => s.selectedTenantName);
  const setSelectedTenantName = useRiskStore((s) => s.setSelectedTenantName);
  const expertModeEnabled = useSystemConfigStore().expertModeEnabled;

  const options = [
    "",
    ...new Set([...CONSULTANT_TENANT_OPTIONS, ...tenantNames].filter(Boolean)),
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-4 border-b border-slate-800 bg-slate-900/30 px-6 py-3"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      <div className="flex shrink-0 items-center gap-2">
        <IronframeHexMark className="h-9 w-9 shrink-0" aria-hidden />
        <h1 className="text-sm font-bold uppercase tracking-wider text-white">
          IRONFRAME v1.0 — ENTERPRISE RISK POSTURE
        </h1>
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
        PROTECTED TENANTS (HEALTHCARE)
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

      <div className="ml-auto flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto">
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
