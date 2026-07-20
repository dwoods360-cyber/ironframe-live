"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { IronleadsSuspectReport } from "@/app/lib/server/ironleadsSuspectReportCore";

type Props = {
  contactId: string;
  report: IronleadsSuspectReport;
};

export default function SuspectOperatorEditPanel({ contactId, report }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(report.fullName);
  const [email, setEmail] = useState(report.email);
  const [phone, setPhone] = useState(report.phone ?? "");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState(report.company);
  const [websiteUrl, setWebsiteUrl] = useState(report.websiteUrl ?? "");
  const [addressLine, setAddressLine] = useState(report.addressLine ?? "");
  const [namedBuyerFullName, setNamedBuyerFullName] = useState(
    report.namedBuyer?.fullName ?? "",
  );
  const [namedBuyerTitle, setNamedBuyerTitle] = useState(report.namedBuyer?.title ?? "");
  const [clearNamedBuyer, setClearNamedBuyer] = useState(false);
  const [promoteToProspect, setPromoteToProspect] = useState(false);
  const [operatorNote, setOperatorNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSave(alsoPromote: boolean) {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/operations-hub/ironleads/suspects/${contactId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            email,
            phone: phone.trim() || null,
            title: title.trim() || undefined,
            company,
            websiteUrl: websiteUrl.trim() || null,
            addressLine: addressLine.trim() || null,
            namedBuyerFullName: clearNamedBuyer ? null : namedBuyerFullName.trim() || null,
            namedBuyerTitle: clearNamedBuyer ? null : namedBuyerTitle.trim() || null,
            clearNamedBuyer,
            promoteToProspect: alsoPromote || promoteToProspect,
            operatorNote: operatorNote.trim() || undefined,
          }),
        },
      );
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error || `Save failed (${response.status})`);
        return;
      }
      setMessage(
        alsoPromote || promoteToProspect
          ? "Saved and promoted to PROSPECT (SalesTeam can draft on next poll)."
          : "Saved contact demographics.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-teal-900/50 bg-teal-950/20 p-5">
      <h2 className="text-lg font-semibold text-teal-100">Operator enrichment</h2>
      <p className="mt-1 text-xs text-slate-400">
        Edit demographics here — the report above is forensic. Clear scrape-noise buyers before
        promote. EMAIL needs a real inbox; otherwise keep SMS to the switchboard.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-slate-400">
          Full name / role label
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Title (optional)
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="vCISO / Partner"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Phone
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
          />
        </label>
        <label className="block text-xs text-slate-400 sm:col-span-2">
          Company
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-slate-400 sm:col-span-2">
          Website
          <input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
          />
        </label>
        <label className="block text-xs text-slate-400 sm:col-span-2">
          Brick-and-mortar address
          <input
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            placeholder="Street, City, ST ZIP"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Named buyer (clear scrape noise)
          <input
            value={namedBuyerFullName}
            onChange={(e) => setNamedBuyerFullName(e.target.value)}
            disabled={clearNamedBuyer}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-40"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Named buyer title
          <input
            value={namedBuyerTitle}
            onChange={(e) => setNamedBuyerTitle(e.target.value)}
            disabled={clearNamedBuyer}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-40"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-amber-200 sm:col-span-2">
          <input
            type="checkbox"
            checked={clearNamedBuyer}
            onChange={(e) => setClearNamedBuyer(e.target.checked)}
          />
          Clear named buyer (remove “PRIVACY COMPLIANCE…” style scrape garbage)
        </label>
        <label className="block text-xs text-slate-400 sm:col-span-2">
          Operator note (appended to deal notes)
          <textarea
            value={operatorNote}
            onChange={(e) => setOperatorNote(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-cyan-200 sm:col-span-2">
          <input
            type="checkbox"
            checked={promoteToProspect}
            onChange={(e) => setPromoteToProspect(e.target.checked)}
          />
          Also promote deal SUSPECT → PROSPECT (SalesTeam poll will draft next)
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSave(false)}
          className="rounded-lg border border-teal-700 bg-teal-950/60 px-4 py-2 text-sm font-medium text-teal-100 hover:border-teal-500 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save demographics"}
        </button>
        <button
          type="button"
          disabled={busy || report.deal?.stage === "PROSPECT"}
          onClick={() => void onSave(true)}
          className="rounded-lg border border-cyan-700 bg-cyan-950/50 px-4 py-2 text-sm font-medium text-cyan-100 hover:border-cyan-500 disabled:opacity-40"
        >
          Save + promote to PROSPECT
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
