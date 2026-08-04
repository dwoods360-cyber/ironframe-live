"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [holdClassification, setHoldClassification] = useState<
    "hold" | "channel_competitor" | "enrich_later" | "pending_batch" | "other"
  >(
    report.operatorHold?.classification === "channel_competitor" ||
      report.accountResearchBrief?.outreach.status === "hold"
      ? "channel_competitor"
      : report.operatorHold?.classification === "pending_batch"
        ? "pending_batch"
        : "hold",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Optimistic HOLD flag so Restore updates UI even before RSC refresh settles. */
  const [onHold, setOnHold] = useState(Boolean(report.operatorHold));
  const [holdSnapshot, setHoldSnapshot] = useState(report.operatorHold);

  useEffect(() => {
    setOnHold(Boolean(report.operatorHold));
    setHoldSnapshot(report.operatorHold);
  }, [report.operatorHold]);

  const isTitleNoise = report.blockers.some((b) => b.code === "OSINT_TITLE_NOISE");

  async function patchSuspect(body: Record<string, unknown>, successMessage: string) {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/operations-hub/ironleads/suspects/${contactId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        report?: IronleadsSuspectReport;
        discarded?: boolean;
      };
      if (!response.ok || !data.ok) {
        setError(data.error || `Save failed (${response.status})`);
        return;
      }
      if (data.discarded) {
        setMessage(successMessage);
        router.push("/dashboard/operations/ironleads");
        router.refresh();
        return;
      }
      if (data.report) {
        setOnHold(Boolean(data.report.operatorHold));
        setHoldSnapshot(data.report.operatorHold);
      } else if (body.restoreFromHoldArchive === true) {
        setOnHold(false);
        setHoldSnapshot(null);
      } else if (body.moveToHoldArchive === true) {
        setOnHold(true);
      }
      setMessage(successMessage);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSave(alsoPromote: boolean) {
    await patchSuspect(
      {
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
      },
      alsoPromote || promoteToProspect
        ? "Saved and promoted to PROSPECT (SalesTeam can draft on next poll)."
        : "Saved contact demographics.",
    );
  }

  async function onMoveToHoldArchive() {
    const ok = window.confirm(
      "Move this SUSPECT to the HOLD archive? It leaves the active queue and can be restored later from Ironleads → HOLD archive.",
    );
    if (!ok) return;
    await patchSuspect(
      {
        moveToHoldArchive: true,
        holdClassification,
        holdReason: operatorNote.trim() || undefined,
        operatorNote: operatorNote.trim() || undefined,
      },
      "Moved to HOLD archive. Retrieve anytime from Ironleads → HOLD archive.",
    );
  }

  async function onRestoreFromHoldArchive() {
    await patchSuspect(
      {
        restoreFromHoldArchive: true,
        operatorNote: operatorNote.trim() || undefined,
      },
      "Restored from HOLD archive into the active SUSPECT queue.",
    );
  }

  async function onDiscardTitleNoise() {
    const ok = window.confirm(
      "Discard this row permanently? It is OSINT/directive title noise (not a buyer company) and will be removed from the SUSPECT queue.",
    );
    if (!ok) return;
    await patchSuspect({ discardSuspect: true }, "Discarded — not a buyer company.");
  }

  async function onEnrichWithApollo() {
    const ok = window.confirm(
      "Call Apollo to enrich this SUSPECT (org + named buyer email if set)? This consumes Apollo credits. Path B send stays on Approvals — Apollo will not email.",
    );
    if (!ok) return;
    await patchSuspect(
      { enrichWithApollo: true },
      "Apollo enrich complete — review email/phone below, then Promote when ready.",
    );
  }

  async function onEnrichWithProspeo() {
    const ok = window.confirm(
      "Call Prospeo to enrich this SUSPECT (named buyer + domain → work email)? This consumes Prospeo credits. Path B send stays on Approvals — Prospeo will not email.",
    );
    if (!ok) return;
    await patchSuspect(
      { enrichWithProspeo: true },
      "Prospeo enrich complete — review email below, then Promote when ready.",
    );
  }

  return (
    <section className="rounded-xl border border-teal-900/50 bg-teal-950/20 p-5">
      <h2 className="text-lg font-semibold text-teal-100">Operator enrichment</h2>
      <p className="mt-1 text-xs text-slate-400">
        Edit demographics here — the report above is forensic. Clear scrape-noise buyers before
        promote. EMAIL needs a real inbox; otherwise keep SMS to the switchboard.
      </p>

      {isTitleNoise ? (
        <div className="mt-4 rounded-lg border border-rose-900/60 bg-rose-950/30 p-4">
          <h3 className="text-sm font-semibold text-rose-100">OSINT title noise</h3>
          <p className="mt-1 text-xs text-slate-400">
            This company field is a directive/article title (e.g. BOD 26-04), not an account. Discard
            it — do not promote or HOLD.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDiscardTitleNoise()}
            className="mt-3 rounded-lg border border-rose-700 bg-rose-950/60 px-4 py-2 text-sm font-medium text-rose-50 hover:border-rose-500 disabled:opacity-40"
          >
            Discard permanently
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-violet-900/50 bg-violet-950/20 p-4">
            <h3 className="text-sm font-semibold text-violet-100">Apollo enrich</h3>
            <p className="mt-1 text-xs text-slate-400">
              Uses <span className="font-mono text-violet-200/90">APOLLO_API_KEY</span>. Set Named
              buyer first for email match. Org enrich runs on domain alone. Does not send mail.
            </p>
            {report.apolloEnrichment ? (
              <p className="mt-2 font-mono text-[11px] text-violet-200/80">
                Last: {report.apolloEnrichment.enrichedAt}
                {report.apolloEnrichment.person?.email
                  ? ` · ${report.apolloEnrichment.person.email}`
                  : report.apolloEnrichment.personMatched
                    ? " · person matched (no email)"
                    : " · org only"}
              </p>
            ) : null}
            <button
              type="button"
              disabled={busy || onHold}
              onClick={() => void onEnrichWithApollo()}
              className="mt-3 rounded-lg border border-violet-700 bg-violet-950/50 px-4 py-2 text-sm font-medium text-violet-50 hover:border-violet-500 disabled:opacity-40"
              title={onHold ? "Restore from HOLD before Apollo enrich" : undefined}
            >
              Enrich with Apollo
            </button>
          </div>
          <div className="rounded-lg border border-sky-900/50 bg-sky-950/20 p-4">
            <h3 className="text-sm font-semibold text-sky-100">Prospeo enrich</h3>
            <p className="mt-1 text-xs text-slate-400">
              Uses <span className="font-mono text-sky-200/90">PROSPEO_API_KEY</span>. Requires Named
              buyer (first + last) and domain. Prefer when Apollo people-match is blocked. Does not
              send mail.
            </p>
            {report.prospeoEnrichment ? (
              <p className="mt-2 font-mono text-[11px] text-sky-200/80">
                Last: {report.prospeoEnrichment.enrichedAt}
                {report.prospeoEnrichment.person?.email
                  ? ` · ${report.prospeoEnrichment.person.email}`
                  : report.prospeoEnrichment.personMatched
                    ? " · person matched (no email)"
                    : " · no match"}
              </p>
            ) : null}
            <button
              type="button"
              disabled={busy || onHold}
              onClick={() => void onEnrichWithProspeo()}
              className="mt-3 rounded-lg border border-sky-700 bg-sky-950/50 px-4 py-2 text-sm font-medium text-sky-50 hover:border-sky-500 disabled:opacity-40"
              title={onHold ? "Restore from HOLD before Prospeo enrich" : undefined}
            >
              Enrich with Prospeo
            </button>
          </div>
        </div>
      )}

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
          disabled={busy || onHold || report.deal?.stage === "PROSPECT"}
          onClick={() => void onSave(true)}
          className="rounded-lg border border-cyan-700 bg-cyan-950/50 px-4 py-2 text-sm font-medium text-cyan-100 hover:border-cyan-500 disabled:opacity-40"
          title={onHold ? "Restore from HOLD archive before promoting" : undefined}
        >
          Save + promote to PROSPECT
        </button>
      </div>

      <div className="mt-5 rounded-lg border border-amber-900/50 bg-amber-950/20 p-4">
        <h3 className="text-sm font-semibold text-amber-100">HOLD archive</h3>
        <p className="mt-1 text-xs text-slate-400">
          After HITL review, park channel-competitors or not-ready accounts here for later
          retrieval. Deal stays SUSPECT; row leaves the active queue.
        </p>
        {onHold ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-amber-200/90">
              Archived {holdSnapshot?.at ?? report.operatorHold?.at} ·{" "}
              {holdSnapshot?.classification ?? report.operatorHold?.classification}
              {(holdSnapshot?.reason ?? report.operatorHold?.reason)
                ? ` — ${holdSnapshot?.reason ?? report.operatorHold?.reason}`
                : ""}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onRestoreFromHoldArchive()}
              className="rounded-lg border border-amber-700 bg-amber-950/50 px-4 py-2 text-sm font-medium text-amber-100 hover:border-amber-500 disabled:opacity-40"
            >
              Restore to active SUSPECT queue
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block text-xs text-slate-400">
              Classification
              <select
                value={holdClassification}
                onChange={(e) =>
                  setHoldClassification(
                    e.target.value as typeof holdClassification,
                  )
                }
                className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                <option value="channel_competitor">Channel / competitor</option>
                <option value="hold">HOLD (re-qualify later)</option>
                <option value="enrich_later">Enrich later</option>
                <option value="pending_batch">Pending pool (batch later)</option>
                <option value="other">Other</option>
              </select>
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onMoveToHoldArchive()}
              className="rounded-lg border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-medium text-amber-50 hover:border-amber-500 disabled:opacity-40"
            >
              Move to HOLD archive
            </button>
          </div>
        )}
      </div>

      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
