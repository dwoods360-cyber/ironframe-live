"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import TemplateEditor from "@/app/settings/config/TemplateEditor";
import { useMailHubStore } from "@/app/utils/mailHubStore";
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
import { getAdminAlertEmail, setAdminAlertEmail } from "@/app/actions/systemConfigDbActions";
import {
  getSecurityPostureConfig,
  saveSecurityPostureConfig,
  type SecurityPostureConfigDto,
} from "@/app/actions/securityPostureActions";
import {
  SECURITY_POSTURE_DUAL_LOCK,
  SECURITY_POSTURE_TRIPARTITE_LOCK,
  SECURITY_POSTURE_LABELS,
  type SecurityPosture,
} from "@/app/config/securityPosture";
import { FORENSIC_ATTESTATION_MIN_VOID } from "@/app/utils/constitutionalForensicGates";
import ExecutiveDowngradeApprovalModal from "@/app/components/ExecutiveDowngradeApprovalModal";
import StaleDataLockdownWaiverPanel from "@/app/components/StaleDataLockdownWaiverPanel";
import {
  getPostureDegradationStatus,
  initiateBoardLevelDowngrade,
} from "@/app/actions/postureDegradationActions";

export default function SystemConfigPage() {
  const config = useSystemConfigStore();
  const mailHubState = useMailHubStore();
  const [socDepartmentEmail, setSocDepartmentEmailInput] = useState("");
  const [domainsInput, setDomainsInput] = useState("medshield.com");
  const [stakeholders, setStakeholders] = useState<CompanyStakeholder[]>([]);
  const [vendorTemplate, setVendorTemplate] = useState("");
  const [adhocGroups, setAdhocGroups] = useState<AdhocNotificationGroup[]>([]);
  const [cadenceAlerts, setCadenceAlertsInput] = useState<CadenceAlertToggles>({ day90: true, day60: true, day30: true });
  const [status, setStatus] = useState<string | null>(null);
  const [adminEscalationEmail, setAdminEscalationEmailInput] = useState("");
  const [securityPosture, setSecurityPosture] = useState<SecurityPosture>(SECURITY_POSTURE_DUAL_LOCK);
  const [savedPosture, setSavedPosture] = useState<SecurityPosture>(SECURITY_POSTURE_DUAL_LOCK);
  const [postureSealGeneratedAt, setPostureSealGeneratedAt] = useState<string | null>(null);
  const [postureDistributionHint, setPostureDistributionHint] = useState<string | null>(null);
  const [degradationJustification, setDegradationJustification] = useState("");
  const [postureSaveBusy, setPostureSaveBusy] = useState(false);
  const [executiveModalOpen, setExecutiveModalOpen] = useState(false);
  const [degradationStatusLabel, setDegradationStatusLabel] = useState<string | null>(null);

  useEffect(() => {
    hydrateSystemConfig();
  }, []);

  const refreshPostureState = () => {
    void getSecurityPostureConfig().then((cfg: SecurityPostureConfigDto) => {
      setSecurityPosture(cfg.posture);
      setSavedPosture(cfg.posture);
      setPostureSealGeneratedAt(cfg.sealGeneratedAt);
    });
    void getPostureDegradationStatus().then((s) => {
      if (!s.active) {
        setDegradationStatusLabel(null);
        return;
      }
      if (s.phase === "COOLDOWN" && s.remainingLabel) {
        setDegradationStatusLabel(`PENDING_DEGRADATION — cool-down ${s.remainingLabel} until DUAL_LOCK`);
      } else {
        setDegradationStatusLabel("PENDING_DEGRADATION — awaiting CEO, CFO, CIO signatures");
      }
    });
  };

  useEffect(() => {
    refreshPostureState();
    const id = window.setInterval(refreshPostureState, 5000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    void getAdminAlertEmail().then((v) => setAdminEscalationEmailInput(v ?? ""));
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
    <div className="min-h-full bg-[#050509] p-6">
      <section className="rounded border border-slate-800 bg-slate-900/40 p-4">
        <h1 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white">SYSTEM CONFIGURATION // SOC EMAIL ORCHESTRATION</h1>
        <p className="mb-4 text-[10px] text-slate-500">
          <Link href="/admin/onboarding" className="text-cyan-400 hover:underline">
            Corporate client onboarding →
          </Link>
          <span className="text-slate-600"> · GLOBAL_ADMIN</span>
        </p>
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

        <div className="mb-4 rounded border border-rose-700/50 bg-rose-950/30 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-rose-200">
            Nuclear Override Posture
          </p>
          <p className="mb-3 text-[10px] text-slate-400">
            Controls how the emergency seal is split for constitutional void override. Saving regenerates a new seal and
            resets spent override state. Segment values are never shown here — distribute offline per the hint after save.
          </p>
          {postureSealGeneratedAt ? (
            <p className="mb-3 text-[10px] text-slate-500">
              Active seal generated: {new Date(postureSealGeneratedAt).toLocaleString()}
            </p>
          ) : null}
          <div className="mb-3 flex flex-col gap-2">
            {([SECURITY_POSTURE_DUAL_LOCK, SECURITY_POSTURE_TRIPARTITE_LOCK] as const).map((posture) => (
              <label
                key={posture}
                className="flex cursor-pointer items-start gap-2 rounded border border-slate-700 bg-slate-900/60 px-3 py-2 text-[10px] text-slate-200"
              >
                <input
                  type="radio"
                  name="security-posture"
                  checked={securityPosture === posture}
                  onChange={() => setSecurityPosture(posture)}
                  className="mt-0.5 accent-rose-500"
                />
                <span>
                  <span className="font-bold uppercase tracking-wide">{SECURITY_POSTURE_LABELS[posture]}</span>
                  {posture === SECURITY_POSTURE_TRIPARTITE_LOCK ? (
                    <span className="mt-1 block text-amber-300/90">
                      Requires three custodians (Vault, CISO, Staff). Downgrade to Dual-Lock requires Board-Level
                      Approval (CEO, CFO, CIO keys), {FORENSIC_ATTESTATION_MIN_VOID}+ char justification, and 24-hour
                      cool-down.
                    </span>
                  ) : (
                    <span className="mt-1 block text-slate-400">
                      Vault + Human (SYSTEM_OWNER) segments — default dual-custody model.
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          {savedPosture === SECURITY_POSTURE_TRIPARTITE_LOCK &&
          securityPosture === SECURITY_POSTURE_DUAL_LOCK ? (
            <div className="mb-3">
              <label
                htmlFor="posture-degradation-justification"
                className="text-[10px] font-bold uppercase tracking-wide text-amber-200"
              >
                Degradation justification ({FORENSIC_ATTESTATION_MIN_VOID}+ chars)
              </label>
              <textarea
                id="posture-degradation-justification"
                value={degradationJustification}
                onChange={(e) => setDegradationJustification(e.target.value)}
                className="mt-1 h-24 w-full rounded border border-amber-700/60 bg-slate-900 px-3 py-2 text-[10px] text-slate-100 outline-none focus:border-amber-500"
                placeholder="Forensic rationale for TRIPARTITE → DUAL downgrade…"
              />
              <p className="mt-1 text-[10px] text-slate-500">
                {degradationJustification.trim().length} / {FORENSIC_ATTESTATION_MIN_VOID}
              </p>
            </div>
          ) : null}
          {degradationStatusLabel ? (
            <p className="mb-3 rounded border border-amber-600/50 bg-amber-950/30 px-3 py-2 text-[10px] text-amber-200">
              {degradationStatusLabel}
            </p>
          ) : null}
          {postureDistributionHint ? (
            <p className="mb-3 rounded border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-[10px] text-emerald-200">
              {postureDistributionHint}
            </p>
          ) : null}
          {savedPosture === SECURITY_POSTURE_TRIPARTITE_LOCK &&
          securityPosture === SECURITY_POSTURE_DUAL_LOCK ? (
            <button
              type="button"
              disabled={
                postureSaveBusy || degradationJustification.trim().length < FORENSIC_ATTESTATION_MIN_VOID
              }
              onClick={() => {
                void (async () => {
                  setPostureSaveBusy(true);
                  const result = await initiateBoardLevelDowngrade(degradationJustification);
                  setPostureSaveBusy(false);
                  if (!result.ok) {
                    setStatus(result.error);
                    return;
                  }
                  setStatus("Board-level downgrade initiated. Awaiting triple-executive signatures.");
                  setExecutiveModalOpen(true);
                  refreshPostureState();
                })();
              }}
              className="mr-2 rounded border border-amber-500/70 bg-amber-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-200 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {postureSaveBusy ? "Initiating…" : "Initiate Board Downgrade"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={
              postureSaveBusy ||
              securityPosture === savedPosture ||
              (savedPosture === SECURITY_POSTURE_TRIPARTITE_LOCK &&
                securityPosture === SECURITY_POSTURE_DUAL_LOCK)
            }
            onClick={() => {
              void (async () => {
                setPostureSaveBusy(true);
                const result = await saveSecurityPostureConfig(securityPosture);
                setPostureSaveBusy(false);
                if (!result.ok) {
                  setStatus(result.error);
                  return;
                }
                setSavedPosture(result.posture);
                setPostureSealGeneratedAt(result.sealGeneratedAt);
                setPostureDistributionHint(result.distributionHint);
                setDegradationJustification("");
                setStatus(`Nuclear override posture saved (${result.posture}). New emergency seal issued.`);
                refreshPostureState();
              })();
            }}
            className="rounded border border-rose-500/70 bg-rose-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-200 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {postureSaveBusy ? "Saving…" : "Save Posture & Regenerate Seal"}
          </button>
          <button
            type="button"
            onClick={() => setExecutiveModalOpen(true)}
            className="ml-2 rounded border border-slate-600 px-3 py-1.5 text-[10px] font-bold uppercase text-slate-300"
          >
            Open Executive Gate
          </button>
          <StaleDataLockdownWaiverPanel />
        </div>
        <ExecutiveDowngradeApprovalModal
          open={executiveModalOpen}
          onClose={() => setExecutiveModalOpen(false)}
          onWorkflowChange={refreshPostureState}
        />

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
            <div className="md:col-span-2">
              <label
                htmlFor="phone-home-email"
                className="text-[10px] font-bold uppercase tracking-wide text-slate-200"
              >
                Escalation Email (Irontech)
              </label>
              <p className="mt-1 mb-1 text-[10px] text-slate-400">
                The address notified when autonomous agents exhaust all recovery attempts.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <input
                  id="phone-home-email"
                  type="email"
                  value={adminEscalationEmail}
                  onChange={(event) => setAdminEscalationEmailInput(event.target.value)}
                  className="min-w-[200px] flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] text-slate-100 outline-none focus:border-amber-500"
                  placeholder="soc-lead@company.com"
                  autoComplete="email"
                />
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      const r = await setAdminAlertEmail(adminEscalationEmail);
                      setStatus(
                        r.ok
                          ? "Escalation email (Irontech) saved."
                          : `Save failed: ${r.error}`,
                      );
                    })();
                  }}
                  className="rounded border border-amber-500/70 bg-amber-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-200"
                >
                  Save Phone Home Target
                </button>
              </div>
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
