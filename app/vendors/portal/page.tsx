"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addVendorAssessment, setVendorAssessmentSyncStatus, VendorAssessmentRecord } from "@/app/store/vendorQuestionnaireStore";
import { calculateVendorQuestionnaireAssessment, VendorIndustry } from "@/app/utils/scoring";

const STEPS = ["General", "Technical", "Compliance", "Financial"] as const;

export default function VendorQuestionnairePortalPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [vendorName, setVendorName] = useState("Azure Health");
  const [industry, setIndustry] = useState<VendorIndustry>("Healthcare");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [incidentResponseReady, setIncidentResponseReady] = useState(true);
  const [hipaaAligned, setHipaaAligned] = useState(true);
  const [nercReady, setNercReady] = useState(true);
  const [submitted, setSubmitted] = useState<VendorAssessmentRecord | null>(null);
  const [isConnectingCloud, setIsConnectingCloud] = useState(false);

  const canNext = useMemo(() => {
    if (stepIndex === 0) {
      return vendorName.trim().length > 1;
    }
    return true;
  }, [stepIndex, vendorName]);

  const handleSubmit = () => {
    const result = calculateVendorQuestionnaireAssessment({
      vendorName,
      industry,
      mfaEnabled,
      encryptionEnabled,
      incidentResponseReady,
    });

    const record = addVendorAssessment(result);
    setSubmitted(record);
  };

  const handleConnectCloudApi = async () => {
    if (!submitted) {
      return;
    }

    setIsConnectingCloud(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const updated = setVendorAssessmentSyncStatus(submitted.id, "LIVE_AWS_SYNC");

    if (updated) {
      setSubmitted(updated);
    }

    setIsConnectingCloud(false);
  };

  return (
    <div className="min-h-full bg-slate-950 p-6">
      <section className="rounded border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <h1 className="text-[11px] font-bold uppercase tracking-wide text-white">INTELLIGENT VENDOR QUESTIONNAIRE // OFFICIAL AUDIT</h1>
          <Link
            href="/vendors"
            className="rounded border border-slate-800 bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase text-slate-300 hover:border-blue-500 hover:text-blue-300"
          >
            Back
          </Link>
        </div>

        <div className="mb-4 grid grid-cols-4 gap-2">
          {STEPS.map((step, index) => {
            const isActive = index === stepIndex;
            const isComplete = index < stepIndex;

            return (
              <button
                key={step}
                type="button"
                onClick={() => setStepIndex(index)}
                className={`rounded border px-3 py-2 text-[10px] font-bold uppercase tracking-wide ${
                  isActive
                    ? "border-blue-500 bg-blue-500/15 text-blue-300"
                    : isComplete
                      ? "border-emerald-600 bg-emerald-500/10 text-emerald-300"
                      : "border-slate-800 bg-slate-950 text-slate-400"
                }`}
              >
                {index + 1}. {step}
              </button>
            );
          })}
        </div>

        <div className="rounded border border-slate-800 bg-slate-950/50 p-4">
          {stepIndex === 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-300">Module 1 // General</p>
              <input
                value={vendorName}
                onChange={(event) => setVendorName(event.target.value)}
                placeholder="Vendor Name"
                className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] text-white focus:border-blue-500 focus:outline-none"
              />
              <select
                value={industry}
                onChange={(event) => setIndustry(event.target.value as VendorIndustry)}
                className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance</option>
                <option value="Energy">Energy</option>
              </select>
            </div>
          )}

          {stepIndex === 1 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-300">Module 2 // Technical Controls</p>
              <ToggleField label="Multi-Factor Authentication (MFA)" value={mfaEnabled} onChange={setMfaEnabled} />
              <ToggleField label="Encryption in Transit/At Rest" value={encryptionEnabled} onChange={setEncryptionEnabled} />
              <ToggleField label="Incident Response Program" value={incidentResponseReady} onChange={setIncidentResponseReady} />
            </div>
          )}

          {stepIndex === 2 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-300">Module 3 // Dynamic Compliance</p>
              {industry === "Healthcare" && (
                <ToggleField label="HIPAA Security Rule Attestation" value={hipaaAligned} onChange={setHipaaAligned} />
              )}
              {industry === "Energy" && (
                <ToggleField label="NERC CIP Control Evidence Readiness" value={nercReady} onChange={setNercReady} />
              )}
              {industry === "Finance" && (
                <p className="rounded border border-slate-800 bg-slate-900/40 px-3 py-2 text-[10px] text-slate-300">
                  Finance profile uses PCI-DSS/SOX attestations from existing Vaultbank controls.
                </p>
              )}
            </div>
          )}

          {stepIndex === 3 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-300">Module 4 // Financial Preview</p>
              <p className="text-[10px] text-slate-400">Submission triggers AI score and financial impact quantification for the mapped tenant entity.</p>
              {!mfaEnabled && (
                <p className="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-[10px] font-bold uppercase text-red-300">
                  MFA Disabled: -30 score deduction and +$500,000 potential financial impact will be applied.
                </p>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
              className="rounded border border-slate-800 bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase text-slate-300 hover:border-slate-600"
            >
              Previous
            </button>

            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStepIndex((value) => Math.min(STEPS.length - 1, value + 1))}
                disabled={!canNext}
                className="rounded border border-blue-500 bg-blue-500/15 px-3 py-1 text-[10px] font-bold uppercase text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-[10px] font-bold uppercase text-emerald-300"
              >
                Submit
              </button>
            )}
          </div>
        </div>

        {submitted && (
          <div className="mt-4 rounded border border-emerald-500/40 bg-emerald-500/5 p-4 text-[10px]">
            <p className="font-bold uppercase tracking-wide text-emerald-300">Submission Complete</p>
            <p className="mt-2 text-slate-200">
              {submitted.vendorName} scored <span className="font-bold text-white">{submitted.score} ({submitted.grade})</span>.
            </p>
            <p className="mt-1 text-slate-300">Potential Financial Impact: ${submitted.potentialFinancialImpact.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="mt-1 text-slate-300">Status: <span className={`font-bold ${submitted.syncStatus === "LIVE_AWS_SYNC" ? "text-emerald-300" : "text-amber-300"}`}>{submitted.syncStatus === "LIVE_AWS_SYNC" ? "Live AWS Sync" : "Manual Form"}</span></p>
            <p className="mt-1 text-slate-300">Top Cost Drivers: {submitted.costDrivers.join(" | ") || "None"}</p>
            <button
              type="button"
              onClick={handleConnectCloudApi}
              disabled={isConnectingCloud || submitted.syncStatus === "LIVE_AWS_SYNC"}
              className="mt-3 mr-2 inline-flex rounded border border-blue-500/70 bg-blue-500/10 px-3 py-1 text-[10px] font-bold uppercase text-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitted.syncStatus === "LIVE_AWS_SYNC" ? "Cloud API Connected" : isConnectingCloud ? "Connecting..." : "CONNECT CLOUD API"}
            </button>
            <Link
              href={`/${submitted.entityKey}`}
              className="mt-3 inline-flex rounded border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase text-slate-200 hover:border-blue-500 hover:text-blue-300"
            >
              Open {submitted.entityKey.toUpperCase()} Dashboard
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

type ToggleFieldProps = {
  label: string;
  value: boolean;
  onChange: (nextValue: boolean) => void;
};

function ToggleField({ label, value, onChange }: ToggleFieldProps) {
  return (
    <div className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/40 px-3 py-2">
      <span className="text-[10px] font-semibold text-slate-200">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded border px-2 py-1 text-[9px] font-bold uppercase ${
            value ? "border-emerald-500 bg-emerald-500/20 text-emerald-300" : "border-slate-700 bg-slate-900 text-slate-400"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded border px-2 py-1 text-[9px] font-bold uppercase ${
            !value ? "border-red-500 bg-red-500/20 text-red-300" : "border-slate-700 bg-slate-900 text-slate-400"
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}
