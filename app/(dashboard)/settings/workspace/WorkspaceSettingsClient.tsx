"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

import {
  syncCompanyProfileSettingsAction,
  syncTenantContactProfileSettingsAction,
  updateWorkspaceAleBaselineSettingsAction,
} from "@/app/actions/settings/workspaceProfileSettings";
import { formatCentsToAccountingUSD } from "@/app/utils/formatCentsToUSD";
import { isBenignRuntimeEmissionError, resolveClientFacingError } from "@/app/utils/safeRuntimeEmission";

type WorkspaceSettingsClientProps = {
  tenantName: string;
  aleBaselineCents: string;
  aleDraftDollars: string;
  companyName: string;
  sector: string;
  departmentsRaw: string;
  hasPrimaryCompany: boolean;
  canEdit: boolean;
  corporatePhone: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  addressCountry: string;
  billingContactEmail: string;
  taxId: string;
  hasContactProfile: boolean;
};

export default function WorkspaceSettingsClient({
  tenantName,
  aleBaselineCents,
  aleDraftDollars: initialAleDraftDollars,
  companyName: initialCompanyName,
  sector: initialSector,
  departmentsRaw: initialDepartmentsRaw,
  hasPrimaryCompany,
  canEdit,
  corporatePhone: initialCorporatePhone,
  addressStreet: initialAddressStreet,
  addressCity: initialAddressCity,
  addressState: initialAddressState,
  addressZip: initialAddressZip,
  addressCountry: initialAddressCountry,
  billingContactEmail: initialBillingContactEmail,
  taxId: initialTaxId,
  hasContactProfile,
}: WorkspaceSettingsClientProps) {
  const [aleBaseline, setAleBaseline] = useState(aleBaselineCents);
  const [aleDraftDollars, setAleDraftDollars] = useState(initialAleDraftDollars);
  const [aleSaveBusy, setAleSaveBusy] = useState(false);
  const [aleSaveError, setAleSaveError] = useState<string | null>(null);
  const [aleSaveMessage, setAleSaveMessage] = useState<string | null>(null);

  const [companyNameDraft, setCompanyNameDraft] = useState(initialCompanyName);
  const [sectorDraft, setSectorDraft] = useState(initialSector);
  const [departmentsDraft, setDepartmentsDraft] = useState(initialDepartmentsRaw);
  const [companySaveBusy, setCompanySaveBusy] = useState(false);
  const [companySaveError, setCompanySaveError] = useState<string | null>(null);
  const [companySaveMessage, setCompanySaveMessage] = useState<string | null>(null);

  const [corporatePhoneDraft, setCorporatePhoneDraft] = useState(initialCorporatePhone);
  const [addressStreetDraft, setAddressStreetDraft] = useState(initialAddressStreet);
  const [addressCityDraft, setAddressCityDraft] = useState(initialAddressCity);
  const [addressStateDraft, setAddressStateDraft] = useState(initialAddressState);
  const [addressZipDraft, setAddressZipDraft] = useState(initialAddressZip);
  const [addressCountryDraft, setAddressCountryDraft] = useState(initialAddressCountry);
  const [billingContactEmailDraft, setBillingContactEmailDraft] = useState(
    initialBillingContactEmail,
  );
  const [taxIdDraft, setTaxIdDraft] = useState(initialTaxId);
  const [contactSaveBusy, setContactSaveBusy] = useState(false);
  const [contactSaveError, setContactSaveError] = useState<string | null>(null);
  const [contactSaveMessage, setContactSaveMessage] = useState<string | null>(null);

  const saveAleBaseline = useCallback(async () => {
    if (aleSaveBusy || !canEdit) return;
    setAleSaveBusy(true);
    setAleSaveError(null);
    setAleSaveMessage(null);
    try {
      const result = await updateWorkspaceAleBaselineSettingsAction(aleDraftDollars);
      if (!result.ok) {
        setAleSaveError(result.error);
        return;
      }
      setAleBaseline(result.aleBaselineCents);
      setAleSaveMessage(
        `ALE baseline saved at ${formatCentsToAccountingUSD(BigInt(result.aleBaselineCents))}.`,
      );
    } catch (error) {
      if (isBenignRuntimeEmissionError(error)) return;
      setAleSaveError(
        resolveClientFacingError(error, "Could not save the ALE baseline.", {
          surface: "WorkspaceSettingsClient",
          method: "POST",
        }) ?? "Could not save the ALE baseline.",
      );
    } finally {
      setAleSaveBusy(false);
    }
  }, [aleDraftDollars, aleSaveBusy, canEdit]);

  const saveCompanyProfile = useCallback(async () => {
    if (companySaveBusy || !canEdit) return;
    setCompanySaveBusy(true);
    setCompanySaveError(null);
    setCompanySaveMessage(null);
    try {
      const result = await syncCompanyProfileSettingsAction({
        companyName: companyNameDraft,
        sector: sectorDraft,
        departmentsRaw: departmentsDraft.trim() || undefined,
      });
      if (!result.ok) {
        setCompanySaveError(result.error);
        return;
      }
      setCompanySaveMessage(
        result.created
          ? "Company profile saved."
          : "Company profile updated.",
      );
    } catch (error) {
      if (isBenignRuntimeEmissionError(error)) return;
      setCompanySaveError(
        resolveClientFacingError(error, "Could not save the company profile.", {
          surface: "WorkspaceSettingsClient",
          method: "POST",
        }) ?? "Could not save the company profile.",
      );
    } finally {
      setCompanySaveBusy(false);
    }
  }, [canEdit, companyNameDraft, companySaveBusy, departmentsDraft, sectorDraft]);

  const saveContactProfile = useCallback(async () => {
    if (contactSaveBusy || !canEdit) return;
    setContactSaveBusy(true);
    setContactSaveError(null);
    setContactSaveMessage(null);
    try {
      const result = await syncTenantContactProfileSettingsAction({
        corporatePhone: corporatePhoneDraft,
        addressStreet: addressStreetDraft,
        addressCity: addressCityDraft,
        addressState: addressStateDraft,
        addressZip: addressZipDraft,
        addressCountry: addressCountryDraft,
        billingContactEmail: billingContactEmailDraft,
        taxId: taxIdDraft,
      });
      if (!result.ok) {
        setContactSaveError(result.error);
        return;
      }
      setContactSaveMessage(
        result.created ? "Corporate contact profile saved." : "Corporate contact profile updated.",
      );
    } catch (error) {
      if (isBenignRuntimeEmissionError(error)) return;
      setContactSaveError(
        resolveClientFacingError(error, "Could not save corporate contact details.", {
          surface: "WorkspaceSettingsClient",
          method: "POST",
        }) ?? "Could not save corporate contact details.",
      );
    } finally {
      setContactSaveBusy(false);
    }
  }, [
    addressCityDraft,
    addressCountryDraft,
    addressStateDraft,
    addressStreetDraft,
    addressZipDraft,
    billingContactEmailDraft,
    canEdit,
    contactSaveBusy,
    corporatePhoneDraft,
    taxIdDraft,
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="border-b border-slate-800/80 pb-6">
        <div className="mb-1 font-mono text-[10px] tracking-widest text-cyan-400 uppercase">
          Workspace configuration
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Workspace settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Review and update the ALE baseline and primary company profile for{" "}
          <span className="text-slate-200">{tenantName}</span>. Changes are written to the tenant
          ledger and recorded in the audit log.
        </p>
        {!canEdit ? (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-xs text-amber-100">
            Read-only view — profile edits require <strong>GRC Manager</strong> or{" "}
            <strong>CISO</strong> role on this workspace.
          </p>
        ) : null}
      </header>

      <section className="rounded-xl border border-amber-500/30 bg-amber-950/15 px-4 py-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-amber-300">
          ALE baseline
        </p>
        <p className="mt-2 text-xs leading-relaxed text-amber-100/90">
          Current value: {formatCentsToAccountingUSD(BigInt(aleBaseline))} (stored as BigInt cents).
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-[10px] text-amber-200/80">
            ALE baseline (USD)
            <input
              type="text"
              inputMode="decimal"
              value={aleDraftDollars}
              onChange={(event) => setAleDraftDollars(event.target.value)}
              disabled={!canEdit}
              placeholder="5900000.00"
              className="mt-1 h-11 w-full rounded-lg border border-amber-700/40 bg-[#0a0500]/40 px-3 font-mono text-sm text-amber-50 outline-none focus:border-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <button
            type="button"
            disabled={aleSaveBusy || !canEdit || !aleDraftDollars.trim()}
            onClick={() => void saveAleBaseline()}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-amber-500/50 bg-amber-950/50 px-5 font-mono text-[10px] font-bold uppercase tracking-wide text-amber-100 transition hover:bg-amber-900/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {aleSaveBusy ? "Saving…" : "Save ALE baseline"}
          </button>
        </div>
        {aleSaveError ? (
          <p className="mt-2 text-xs text-rose-300" role="alert">
            {aleSaveError}
          </p>
        ) : null}
        {aleSaveMessage ? (
          <p className="mt-2 text-xs text-emerald-300" role="status">
            {aleSaveMessage}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-cyan-500/30 bg-cyan-950/15 px-4 py-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-300">
          Company profile
        </p>
        <p className="mt-2 text-xs leading-relaxed text-cyan-100/90">
          {hasPrimaryCompany
            ? "Update the primary company record used by Integrity Hub and board reporting."
            : "No primary company record yet — save a profile to unlock downstream GRC surfaces."}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-[10px] text-cyan-200/80">
            Company name
            <input
              type="text"
              value={companyNameDraft}
              onChange={(event) => setCompanyNameDraft(event.target.value)}
              disabled={!canEdit}
              className="mt-1 h-11 w-full rounded-lg border border-cyan-700/40 bg-[#020617]/40 px-3 font-mono text-sm text-cyan-50 outline-none focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="block text-[10px] text-cyan-200/80">
            Sector
            <input
              type="text"
              value={sectorDraft}
              onChange={(event) => setSectorDraft(event.target.value)}
              disabled={!canEdit}
              className="mt-1 h-11 w-full rounded-lg border border-cyan-700/40 bg-[#020617]/40 px-3 font-mono text-sm text-cyan-50 outline-none focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="block text-[10px] text-cyan-200/80 sm:col-span-2">
            Departments (optional, comma or newline separated)
            <textarea
              value={departmentsDraft}
              onChange={(event) => setDepartmentsDraft(event.target.value)}
              disabled={!canEdit}
              rows={2}
              className="mt-1 min-h-[2.75rem] w-full rounded-lg border border-cyan-700/40 bg-[#020617]/40 px-3 py-2 font-mono text-sm text-cyan-50 outline-none focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={
            companySaveBusy || !canEdit || !companyNameDraft.trim() || !sectorDraft.trim()
          }
          onClick={() => void saveCompanyProfile()}
          className="mt-4 inline-flex h-11 items-center justify-center rounded-lg border border-cyan-500/50 bg-cyan-950/50 px-5 font-mono text-[10px] font-bold uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-900/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {companySaveBusy ? "Saving…" : "Save company profile"}
        </button>
        {companySaveError ? (
          <p className="mt-2 text-xs text-rose-300" role="alert">
            {companySaveError}
          </p>
        ) : null}
        {companySaveMessage ? (
          <p className="mt-2 text-xs text-emerald-300" role="status">
            {companySaveMessage}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-violet-500/30 bg-violet-950/15 px-4 py-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-violet-300">
          Corporate contact
        </p>
        <p className="mt-2 text-xs leading-relaxed text-violet-100/90">
          {hasContactProfile
            ? "Update billing and headquarters contact details for this workspace."
            : "No corporate contact record yet — save details for billing and compliance correspondence."}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-[10px] text-violet-200/80">
            Corporate phone
            <input
              type="tel"
              value={corporatePhoneDraft}
              onChange={(event) => setCorporatePhoneDraft(event.target.value)}
              disabled={!canEdit}
              className="mt-1 h-11 w-full rounded-lg border border-violet-700/40 bg-[#0f051a]/40 px-3 font-mono text-sm text-violet-50 outline-none focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="block text-[10px] text-violet-200/80">
            Billing contact email
            <input
              type="email"
              value={billingContactEmailDraft}
              onChange={(event) => setBillingContactEmailDraft(event.target.value)}
              disabled={!canEdit}
              className="mt-1 h-11 w-full rounded-lg border border-violet-700/40 bg-[#0f051a]/40 px-3 font-mono text-sm text-violet-50 outline-none focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="block text-[10px] text-violet-200/80 sm:col-span-2">
            Street address
            <input
              type="text"
              value={addressStreetDraft}
              onChange={(event) => setAddressStreetDraft(event.target.value)}
              disabled={!canEdit}
              className="mt-1 h-11 w-full rounded-lg border border-violet-700/40 bg-[#0f051a]/40 px-3 font-mono text-sm text-violet-50 outline-none focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="block text-[10px] text-violet-200/80">
            City
            <input
              type="text"
              value={addressCityDraft}
              onChange={(event) => setAddressCityDraft(event.target.value)}
              disabled={!canEdit}
              className="mt-1 h-11 w-full rounded-lg border border-violet-700/40 bg-[#0f051a]/40 px-3 font-mono text-sm text-violet-50 outline-none focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="block text-[10px] text-violet-200/80">
            State / province
            <input
              type="text"
              value={addressStateDraft}
              onChange={(event) => setAddressStateDraft(event.target.value)}
              disabled={!canEdit}
              className="mt-1 h-11 w-full rounded-lg border border-violet-700/40 bg-[#0f051a]/40 px-3 font-mono text-sm text-violet-50 outline-none focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="block text-[10px] text-violet-200/80">
            Postal code
            <input
              type="text"
              value={addressZipDraft}
              onChange={(event) => setAddressZipDraft(event.target.value)}
              disabled={!canEdit}
              className="mt-1 h-11 w-full rounded-lg border border-violet-700/40 bg-[#0f051a]/40 px-3 font-mono text-sm text-violet-50 outline-none focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="block text-[10px] text-violet-200/80">
            Country
            <input
              type="text"
              value={addressCountryDraft}
              onChange={(event) => setAddressCountryDraft(event.target.value)}
              disabled={!canEdit}
              className="mt-1 h-11 w-full rounded-lg border border-violet-700/40 bg-[#0f051a]/40 px-3 font-mono text-sm text-violet-50 outline-none focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="block text-[10px] text-violet-200/80 sm:col-span-2">
            Tax ID (optional)
            <input
              type="text"
              value={taxIdDraft}
              onChange={(event) => setTaxIdDraft(event.target.value)}
              disabled={!canEdit}
              className="mt-1 h-11 w-full rounded-lg border border-violet-700/40 bg-[#0f051a]/40 px-3 font-mono text-sm text-violet-50 outline-none focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={contactSaveBusy || !canEdit}
          onClick={() => void saveContactProfile()}
          className="mt-4 inline-flex h-11 items-center justify-center rounded-lg border border-violet-500/50 bg-violet-950/50 px-5 font-mono text-[10px] font-bold uppercase tracking-wide text-violet-100 transition hover:bg-violet-900/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {contactSaveBusy ? "Saving…" : "Save corporate contact"}
        </button>
        {contactSaveError ? (
          <p className="mt-2 text-xs text-rose-300" role="alert">
            {contactSaveError}
          </p>
        ) : null}
        {contactSaveMessage ? (
          <p className="mt-2 text-xs text-emerald-300" role="status">
            {contactSaveMessage}
          </p>
        ) : null}
      </section>

      <p className="text-xs text-slate-500">
        Need onboarding checklists instead?{" "}
        <Link href="/get-started" className="text-cyan-400 underline-offset-2 hover:underline">
          Open Get Started portal
        </Link>
        .
      </p>
    </div>
  );
}
