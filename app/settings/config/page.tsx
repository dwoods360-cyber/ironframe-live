"use client";

import { FormEvent, useEffect, useState, useRef } from "react";
import IrontechDashboard from "@/app/components/IrontechDashboard";
import TemplateEditor from "@/app/settings/config/TemplateEditor";
import { useMailHubStore } from "@/app/utils/mailHubStore";
import { appendAuditLog, purgeSimulationAuditLogs } from "@/app/utils/auditLogger";
import { useRiskStore } from "@/app/store/riskStore";
import { useKimbotStore } from "@/app/store/kimbotStore";
import { useGrcBotStore } from "@/app/store/grcBotStore";
import { generateKimbotSignal, kimbotIntervalMs, type KimbotAttackType } from "@/app/utils/kimbotEngine";
import { useComputeBilling } from "@/app/hooks/useComputeBilling";
import { wakeBlueTeam, sleepBlueTeam } from "@/app/utils/blueTeamSync";
import { useAgentStore } from "@/app/store/agentStore";
import {
  AdhocNotificationGroup,
  CadenceAlertToggles,
  CompanyStakeholder,
  hydrateSystemConfig,
  setAdhocNotificationGroups,
  setAuthorizedSocDomains,
  setCadenceAlerts,
  setCompanyStakeholders,
  setExpertModeEnabled,
  setSocAutoReceiptEnabled,
  setSocDepartmentEmail,
  setSocEmailIntakeEnabled,
  setVendorDocumentUpdateTemplate,
  useSystemConfigStore,
} from "@/app/store/systemConfigStore";

export default function SystemConfigPage() {
  const config = useSystemConfigStore();
  const mailHubState = useMailHubStore();
  const [socDepartmentEmail, setSocDepartmentEmailInput] = useState("");
  const [domainsInput, setDomainsInput] = useState("medshield.com");
  const [stakeholders, setStakeholders] = useState<CompanyStakeholder[]>([]);
  const [vendorTemplate, setVendorTemplate] = useState("");
  const [adhocGroups, setAdhocGroups] = useState<AdhocNotificationGroup[]>([]);
  const [cadenceAlerts, setCadenceAlertsInput] = useState<CadenceAlertToggles>({ day90: true, day60: true, day30: true });
  const [showIrontechDiagnostics, setShowIrontechDiagnostics] = useState(false);
  const [heuristicEnabled, setHeuristicEnabled] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const kimbotEnabled = useKimbotStore((s) => s.enabled);
  const kimbotIntensity = useKimbotStore((s) => s.intensity);
  const kimbotAttackType = useKimbotStore((s) => s.attackType);
  const setKimbotEnabled = useKimbotStore((s) => s.setEnabled);
  const setKimbotIntensity = useKimbotStore((s) => s.setIntensity);
  const setKimbotAttackType = useKimbotStore((s) => s.setAttackType);
  const addInjectedSignal = useKimbotStore((s) => s.addInjectedSignal);
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const selectedTenantName = useRiskStore((s) => s.selectedTenantName);
  const kimbotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const grcBotEnabled = useGrcBotStore((s) => s.enabled);
  const grcBotCompanyCount = useGrcBotStore((s) => s.companyCount);
  const setGrcBotEnabled = useGrcBotStore((s) => s.setEnabled);
  const setGrcBotCompanyCount = useGrcBotStore((s) => s.setCompanyCount);

  const billing = useComputeBilling();

  useEffect(() => {
    if (!kimbotEnabled) {
      if (kimbotIntervalRef.current) {
        clearInterval(kimbotIntervalRef.current);
        kimbotIntervalRef.current = null;
      }
      return;
    }
    const tick = () => {
      const signal = generateKimbotSignal(selectedIndustry, kimbotAttackType, kimbotIntensity);
      addInjectedSignal(signal);
      const ts = new Date().toISOString();
      useAgentStore.getState().addStreamMessage(`> [${ts}] KIMBOT: ${signal.title} (${signal.severity})`);
    };
    tick();
    const ms = kimbotIntervalMs(kimbotIntensity);
    kimbotIntervalRef.current = setInterval(tick, ms);
    return () => {
      if (kimbotIntervalRef.current) {
        clearInterval(kimbotIntervalRef.current);
        kimbotIntervalRef.current = null;
      }
    };
  }, [kimbotEnabled, kimbotIntensity, kimbotAttackType, selectedIndustry, addInjectedSignal]);

  const handleKimbotToggle = (next: boolean) => {
    setKimbotEnabled(next);
    if (next) wakeBlueTeam();
    else sleepBlueTeam();
    appendAuditLog({
      action_type: next ? "RED_TEAM_SIMULATION_START" : "RED_TEAM_SIMULATION_STOP",
      log_type: "SIMULATION",
      description: next
        ? `KIMBOT Red Team simulation started. Attack: ${kimbotAttackType}, Intensity: ${kimbotIntensity}, Industry: ${selectedIndustry}.`
        : `KIMBOT Red Team simulation stopped.`,
      metadata_tag: next
        ? `SIMULATION|KIMBOT|industry:${selectedIndustry}|attack:${kimbotAttackType}|intensity:${kimbotIntensity}${
            selectedTenantName ? `|tenant:${selectedTenantName}` : ""
          }`
        : "SIMULATION|KIMBOT|stop",
    });
    setStatus(next ? "KIMBOT Red Team simulation ON." : "KIMBOT Red Team simulation OFF.");
  };

  const handleGrcBotToggle = (next: boolean) => {
    setGrcBotEnabled(next);
    appendAuditLog({
      action_type: next ? "RED_TEAM_SIMULATION_START" : "RED_TEAM_SIMULATION_STOP",
      log_type: "SIMULATION",
      description: next
        ? `GRCBOT Operations Simulator started. Simulating ${grcBotCompanyCount} companies; vendor submits and acknowledge/process with ~15% SLA fail.`
        : `GRCBOT Operations Simulator stopped.`,
      metadata_tag: next
        ? `SIMULATION|GRCBOT|start|companies:${grcBotCompanyCount}${
            selectedIndustry ? `|industry:${selectedIndustry}` : ""
          }${selectedTenantName ? `|tenant:${selectedTenantName}` : ""}`
        : "SIMULATION|GRCBOT|stop",
    });
    setStatus(next ? "GRCBOT Operations Simulator ON." : "GRCBOT Operations Simulator OFF.");
  };

  useEffect(() => {
    hydrateSystemConfig();
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setSocDepartmentEmailInput(config.socDepartmentEmail);
      setDomainsInput(config.authorizedSocDomains.join(", "));
      setStakeholders(config.companyStakeholders);
      setVendorTemplate(config.vendorDocumentUpdateTemplate);
      setAdhocGroups(config.adhocNotificationGroups);
      setCadenceAlertsInput(config.cadenceAlerts);
    });
  }, [
    config.adhocNotificationGroups,
    config.authorizedSocDomains,
    config.cadenceAlerts,
    config.companyStakeholders,
    config.socDepartmentEmail,
    config.vendorDocumentUpdateTemplate,
  ]);

  const handleSaveDomains = (event: FormEvent) => {
    event.preventDefault();
    const domains = domainsInput
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    setAuthorizedSocDomains(domains);
    setStatus("Authorized domains saved.");
  };

  const updateStakeholder = (index: number, key: keyof CompanyStakeholder, value: string | boolean) => {
    setStakeholders((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    );
  };

  const updateAdhocGroup = (index: number, key: keyof AdhocNotificationGroup, value: string | boolean) => {
    setAdhocGroups((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    );
  };

  return (
    <div className="min-h-full bg-slate-950 p-6">
      <section className="rounded border border-slate-800 bg-slate-900/40 p-4">
        <h1 className="mb-4 text-[11px] font-bold uppercase tracking-wide text-white">SYSTEM CONFIGURATION // SOC EMAIL ORCHESTRATION</h1>
        <div className="mb-4 rounded border border-emerald-500/60 bg-emerald-500/10 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">Current User: Dereck</p>
        </div>

        <div className="mb-4 flex items-center justify-between rounded border border-slate-700 bg-slate-950/40 px-3 py-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-200">Expert Mode</p>
            <p className="text-[10px] text-slate-400">
              OFF: simplified risk levels · ON: full financial exposure + telemetry
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setExpertModeEnabled(!config.expertModeEnabled);
              setStatus(`Expert Mode ${!config.expertModeEnabled ? "enabled" : "disabled"}.`);
            }}
            className={`rounded border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
              config.expertModeEnabled
                ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-300"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            {config.expertModeEnabled ? "ON" : "OFF"}
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between rounded border border-slate-700 bg-slate-950/40 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-200">Irontech Access Chip</p>
          <button
            type="button"
            onClick={() => setShowIrontechDiagnostics((current) => !current)}
            className="rounded border border-cyan-500/70 bg-cyan-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-200"
          >
            {showIrontechDiagnostics ? "Back" : "IRONTECH ACCESS"}
          </button>
        </div>

        {showIrontechDiagnostics && (
          <div className="mb-4 rounded border border-cyan-500/40 bg-slate-950/50 p-2">
            <IrontechDashboard
              orchestrationLogs={[]}
              heuristicEnabled={heuristicEnabled}
              onToggleHeuristic={() => setHeuristicEnabled((current) => !current)}
            />
          </div>
        )}

        <div className="mb-4 rounded border border-rose-500/40 bg-slate-950/40 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-200">KIMBOT // Red Team Data Generator</p>
          <p className="mb-3 text-[10px] text-slate-400">Stress-test AGENT STREAM, GRC gates, and 15-minute liability alert. Industry-aware (uses selected Industry Profile).</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-300">KIMBOT</span>
              <button
                type="button"
                onClick={() => handleKimbotToggle(!kimbotEnabled)}
                className={`rounded border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  kimbotEnabled ? "border-rose-500/70 bg-rose-500/15 text-rose-300" : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                {kimbotEnabled ? "ON" : "OFF"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="kimbot-intensity" className="text-[10px] font-bold uppercase tracking-wide text-slate-300">
                Attack Intensity (1–10)
              </label>
              <input
                id="kimbot-intensity"
                type="range"
                min={1}
                max={10}
                value={kimbotIntensity}
                onChange={(e) => setKimbotIntensity(Number(e.target.value))}
                className="w-24 accent-rose-500"
              />
              <span className="text-[10px] font-mono text-slate-400">{kimbotIntensity}</span>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="kimbot-type" className="text-[10px] font-bold uppercase tracking-wide text-slate-300">
                Attack Type
              </label>
              <select
                id="kimbot-type"
                value={kimbotAttackType}
                onChange={(e) => setKimbotAttackType(e.target.value as KimbotAttackType)}
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100 outline-none focus:border-rose-500"
              >
                <option value="Ransomware">Ransomware</option>
                <option value="Data Leak">Data Leak</option>
                <option value="API Breach">API Breach</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded border border-amber-500/40 bg-slate-950/40 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-200">GRCBOT // Operations Simulator</p>
          <p className="mb-3 text-[10px] text-slate-400">Simulate 1–100 companies: vendor artifact submissions, GRC acknowledge/process events, and occasional SLA failures so Reports SLA Compliance drops below 100%.</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-300">GRCBOT</span>
              <button
                type="button"
                onClick={() => handleGrcBotToggle(!grcBotEnabled)}
                className={`rounded border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  grcBotEnabled ? "border-amber-500/70 bg-amber-500/15 text-amber-300" : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                {grcBotEnabled ? "ON" : "OFF"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="grcbot-companies" className="text-[10px] font-bold uppercase tracking-wide text-slate-300">
                Companies (1–100)
              </label>
              <input
                id="grcbot-companies"
                type="number"
                min={1}
                max={100}
                value={grcBotCompanyCount}
                onChange={(e) => setGrcBotCompanyCount(Number(e.target.value) || 50)}
                className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100 outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const removed = purgeSimulationAuditLogs();
                  setStatus(`Force Reset: ${removed} simulation audit log entries removed. Historical Entries count synced.`);
                }}
                className="rounded border border-slate-600 bg-slate-800 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-200 hover:bg-slate-700"
              >
                Force Reset
              </button>
              <span className="text-[10px] text-slate-500">Clear simulation entries from audit log</span>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded border border-slate-700 bg-slate-950/40 p-3">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-200">License & Compute // Unit Economics</p>
          <p className="mb-3 text-[10px] text-slate-400">Developer budget $20/mo. Burn is driven by KIMBOT raw signals and GRCBOT active tenants. At 100 companies, burn accelerates to test billing alerts.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded border border-slate-800 bg-slate-900/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Active Tenants</p>
              <p className="mt-1 text-xl font-light text-slate-200">
                {billing.activeTenants}/{billing.activeTenantsMax}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">GRCBOT companies when ON</p>
            </div>
            <div className="rounded border border-slate-800 bg-slate-900/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Monthly Burn</p>
              <p className="mt-1 text-xl font-light text-slate-200">
                ${billing.monthlyBurnUsd.toFixed(2)} <span className="text-[10px] text-slate-500">/ ${billing.budgetMonthlyUsd}</span>
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    billing.burnPct >= 100 ? "bg-rose-500" : billing.burnPct >= 80 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, billing.burnPct)}%` }}
                />
              </div>
              {billing.burnPct > 100 && (
                <p className="mt-1 text-[10px] font-medium text-rose-400">Over budget — billing alert</p>
              )}
              {billing.burnAccelerated && (
                <p className="mt-1 text-[10px] font-medium text-amber-400">Accelerated (100 tenants)</p>
              )}
            </div>
            <div className="rounded border border-slate-800 bg-slate-900/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Margin Estimate</p>
              <p className={`mt-1 text-xl font-light ${billing.marginEstimateUsd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                ${billing.marginEstimateUsd >= 0 ? "" : "-"}${Math.abs(billing.marginEstimateUsd).toFixed(2)}/mo
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                Revenue ${billing.projectedRevenueUsd.toFixed(0)} − cost ${billing.monthlyBurnUsd.toFixed(2)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">
            Signals: {billing.totalKimbotSignals} (KIMBOT) · GRC risks in pipeline: {billing.grcBotRisksCount}
          </p>
        </div>

        <div className="mb-4 rounded border border-slate-700 bg-slate-950/40 p-3">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-200">Section A // SOC Core</p>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-300">Email Settings</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="soc-dept-email" className="text-[10px] font-bold uppercase tracking-wide text-slate-200">
                SOC Department Email
              </label>
              <input
                id="soc-dept-email"
                value={socDepartmentEmail}
                onChange={(event) => setSocDepartmentEmailInput(event.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] text-slate-100 outline-none focus:border-blue-500"
                placeholder="soc@company.com"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSocDepartmentEmail(socDepartmentEmail);
                  setStatus("SOC department email saved.");
                }}
                className="rounded border border-blue-500/70 bg-blue-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-200"
              >
                Save SOC Email
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-200">SOC Email Ingest Engine</p>
              <button
                type="button"
                onClick={() => {
                  setSocEmailIntakeEnabled(!config.socEmailIntakeEnabled);
                  setStatus(`SOC Email Ingest Engine ${!config.socEmailIntakeEnabled ? "enabled" : "disabled"}.`);
                }}
                className={`rounded border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  config.socEmailIntakeEnabled
                    ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-300"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                {config.socEmailIntakeEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-200">Auto-Receipt Toggle</p>
              <button
                type="button"
                onClick={() => {
                  setSocAutoReceiptEnabled(!config.socAutoReceiptEnabled);
                  setStatus(`SOC auto-receipt ${!config.socAutoReceiptEnabled ? "enabled" : "disabled"}.`);
                }}
                className={`rounded border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  config.socAutoReceiptEnabled
                    ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-300"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                {config.socAutoReceiptEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveDomains} className="rounded border border-slate-800 bg-slate-950/40 p-3">
          <label htmlFor="soc-domains" className="text-[10px] font-bold uppercase tracking-wide text-slate-200">
            Authorized Domains
          </label>
          <p className="mb-2 mt-1 text-[10px] text-slate-400">Default: medshield.com (comma-separated for multiple)</p>

          <input
            id="soc-domains"
            value={domainsInput}
            onChange={(event) => setDomainsInput(event.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] text-slate-100 outline-none focus:border-blue-500"
            placeholder="medshield.com"
          />

          <button
            type="submit"
            className="mt-3 rounded border border-blue-500/70 bg-blue-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-200"
          >
            Save Domains
          </button>
        </form>

        <div className="mt-4 rounded border border-slate-700 bg-slate-950/40 p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-200">Section B // Company Stakeholders</p>
            <button
              type="button"
              onClick={() => {
                setCompanyStakeholders(stakeholders);
                setStatus("Stakeholder table saved.");
              }}
              className="rounded border border-blue-500/70 bg-blue-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-200"
            >
              Save Stakeholders
            </button>
          </div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-300">Stakeholder Table</p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[10px] text-slate-200">
              <thead>
                <tr className="border-b border-slate-800 text-left uppercase tracking-wide text-slate-400">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Title</th>
                  <th className="px-2 py-2">Email Address</th>
                  <th className="px-2 py-2">Department</th>
                  <th className="px-2 py-2">Include Read Receipt</th>
                  <th className="px-2 py-2">Read Receipt Log</th>
                </tr>
              </thead>
              <tbody>
                {stakeholders.map((stakeholder, index) => (
                  <tr key={stakeholder.id} className="border-b border-slate-800/70">
                    <td className="px-2 py-2">
                      <input
                        value={stakeholder.name}
                        onChange={(event) => updateStakeholder(index, "name", event.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100 outline-none focus:border-blue-500"
                        placeholder="Stakeholder name"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        value={stakeholder.title}
                        onChange={(event) => updateStakeholder(index, "title", event.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100 outline-none focus:border-blue-500"
                        placeholder="Title"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        value={stakeholder.email}
                        onChange={(event) => updateStakeholder(index, "email", event.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100 outline-none focus:border-blue-500"
                        placeholder="email@company.com"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        value={stakeholder.department}
                        onChange={(event) => updateStakeholder(index, "department", event.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100 outline-none focus:border-blue-500"
                        placeholder="Department"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={stakeholder.includeReadReceipt}
                        onChange={(event) => updateStakeholder(index, "includeReadReceipt", event.target.checked)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 accent-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2 text-slate-400">
                      {stakeholder.readReceiptLog.length === 0 ? "No receipts logged" : stakeholder.readReceiptLog.join(" | ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded border border-slate-800 bg-slate-950/50 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-200">Recent Communications // Dispatch Summary</p>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {mailHubState.outbound.length === 0 ? (
                <p className="text-[10px] text-slate-400">No communications dispatched yet.</p>
              ) : (
                mailHubState.outbound.slice(0, 10).map((mail) => (
                  <div key={mail.id} className="rounded border border-slate-800 bg-slate-900/40 px-2 py-2 text-[10px] text-slate-300">
                    <p className="font-bold text-slate-100">{mail.subject}</p>
                    <p>
                      {mail.recipientTitle} ({mail.recipientEmail}) | Priority: {mail.priority}
                      {mail.cadenceMilestone ? ` | ${mail.cadenceMilestone}-Day` : ""}
                    </p>
                    <p className="text-slate-400">
                      Sent: {mail.sentAt} | Receipt: {mail.readStatus}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded border border-slate-700 bg-slate-950/40 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-200">Section C // Vendor Alerts</p>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-300">30/60/90 Escalation Toggles</p>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {([
              { key: "day90", label: "90-Day Courtesy" },
              { key: "day60", label: "60-Day Evidence" },
              { key: "day30", label: "30-Day CISO/Legal" },
            ] as const).map((toggle) => (
              <button
                key={toggle.key}
                type="button"
                onClick={() =>
                  setCadenceAlertsInput((current) => ({
                    ...current,
                    [toggle.key]: !current[toggle.key],
                  }))
                }
                className={`rounded border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  cadenceAlerts[toggle.key]
                    ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-300"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                {toggle.label}: {cadenceAlerts[toggle.key] ? "ON" : "OFF"}
              </button>
            ))}
          </div>

          <label htmlFor="vendor-template" className="text-[10px] font-bold uppercase tracking-wide text-slate-200">
            Document Update Request Template
          </label>
          <textarea
            id="vendor-template"
            value={vendorTemplate}
            onChange={(event) => setVendorTemplate(event.target.value)}
            className="mt-1 h-24 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] text-slate-100 outline-none focus:border-blue-500"
            placeholder="Please review and update attached compliance documentation."
          />
          <button
            type="button"
            onClick={() => {
              setVendorDocumentUpdateTemplate(vendorTemplate);
              setCadenceAlerts(cadenceAlerts);
              setStatus("Vendor document update template saved.");
            }}
            className="mt-3 rounded border border-blue-500/70 bg-blue-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-200"
          >
            Save Vendor Alerts
          </button>
        </div>

        <div className="mt-4 rounded border border-slate-700 bg-slate-950/40 p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-200">Section D // Ad-hoc Notification Groups</p>
            <button
              type="button"
              onClick={() => {
                setAdhocNotificationGroups(adhocGroups);
                setStatus("Ad-hoc notification groups saved.");
              }}
              className="rounded border border-blue-500/70 bg-blue-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-200"
            >
              Save Groups
            </button>
          </div>

          <div className="space-y-3">
            {adhocGroups.map((group, index) => (
              <div key={group.id} className="rounded border border-slate-800 bg-slate-900/40 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-300">Slot {index + 1}</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <input
                    value={group.name}
                    onChange={(event) => updateAdhocGroup(index, "name", event.target.value)}
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100 outline-none focus:border-blue-500"
                    placeholder="Group name"
                  />
                  <input
                    value={group.emails}
                    onChange={(event) => updateAdhocGroup(index, "emails", event.target.value)}
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100 outline-none focus:border-blue-500"
                    placeholder="email1@company.com, email2@company.com"
                  />
                </div>
                <label className="mt-2 inline-flex items-center gap-2 text-[10px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={group.includeReadReceipt}
                    onChange={(event) => updateAdhocGroup(index, "includeReadReceipt", event.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 accent-blue-500"
                  />
                  Track read receipt
                </label>
              </div>
            ))}
          </div>
        </div>

        <TemplateEditor onStatus={setStatus} />

        {status && <p className="mt-3 text-[10px] text-slate-300">{status}</p>}
      </section>
    </div>
  );
}
