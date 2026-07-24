"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  DESIGN_PARTNER_MIN_WINDOW_DAYS,
  formatPathBUsd,
} from "@/lib/ironframeProductKnowledge/commercial";
import {
  DESIGN_PARTNER_ORDER_FORM_LOCK_WORD,
  DESIGN_PARTNER_ORDER_FORM_STORAGE_KEY,
  ORDER_FORM_COMMERCIAL_LOCKS,
  createEmptyOrderFormDraft,
  createEmptyOrderFormLockState,
  evaluateOrderFormLockEligibility,
  lockOrderForm,
  matchesOrderFormLockWord,
  renderOrderFormMarkdown,
  suggestOrderFormFromRecap,
  unlockOrderForm,
  type DesignPartnerOrderFormDraft,
  type DesignPartnerOrderFormLockState,
} from "@/app/lib/operations/designPartnerOrderForm";
import { loadWorkflowReviewRecap } from "@/app/lib/operations/workflowReviewRecapBridge";
import { copyTextToClipboard } from "@/app/utils/safeClipboard";

type PersistedBundle = {
  draft: DesignPartnerOrderFormDraft;
  lock: DesignPartnerOrderFormLockState;
};

function loadPersisted(): PersistedBundle | null {
  try {
    const raw = sessionStorage.getItem(DESIGN_PARTNER_ORDER_FORM_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedBundle;
  } catch {
    return null;
  }
}

function savePersisted(bundle: PersistedBundle) {
  try {
    sessionStorage.setItem(DESIGN_PARTNER_ORDER_FORM_STORAGE_KEY, JSON.stringify(bundle));
  } catch {
    /* ignore */
  }
}

export default function DesignPartnerOrderFormClient() {
  const [draft, setDraft] = useState<DesignPartnerOrderFormDraft>(() =>
    createEmptyOrderFormDraft(),
  );
  const [lock, setLock] = useState<DesignPartnerOrderFormLockState>(() =>
    createEmptyOrderFormLockState(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [lockWordInput, setLockWordInput] = useState("");
  const [unlockReason, setUnlockReason] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    const persisted = loadPersisted();
    if (persisted?.draft) setDraft(persisted.draft);
    if (persisted?.lock) setLock(persisted.lock);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePersisted({ draft, lock });
  }, [draft, lock, hydrated]);

  const eligibility = useMemo(() => evaluateOrderFormLockEligibility(draft), [draft]);
  const markdown = useMemo(
    () => renderOrderFormMarkdown(draft, ORDER_FORM_COMMERCIAL_LOCKS, lock),
    [draft, lock],
  );
  const frozen = lock.locked;

  const patchDraft = useCallback(
    (patch: Partial<DesignPartnerOrderFormDraft>) => {
      if (frozen) return;
      setDraft((prev) => ({ ...prev, ...patch }));
      setError(null);
    },
    [frozen],
  );

  const setCriterion = (index: 0 | 1 | 2, value: string) => {
    if (frozen) return;
    setDraft((prev) => {
      const next: [string, string, string] = [...prev.successCriteria];
      next[index] = value;
      return { ...prev, successCriteria: next };
    });
  };

  const suggestFromCall = () => {
    if (frozen) {
      setError("Form is locked — unlock with an audit reason before suggesting.");
      return;
    }
    const recap = loadWorkflowReviewRecap();
    if (!recap) {
      setError(
        "No LIVE recap in this browser session. Run End LIVE → recap on the workflow-review desk first (same tab/session).",
      );
      return;
    }
    setDraft((prev) =>
      suggestOrderFormFromRecap(
        {
          company: recap.company,
          contactName: recap.contactName,
          summary: recap.summary,
          actionItems: recap.actionItems,
          openQuestions: recap.openQuestions,
          generatedAt: recap.generatedAt,
        },
        prev,
      ),
    );
    setBanner(
      `Suggested from call (${recap.company}${recap.contactName ? ` · ${recap.contactName}` : ""}). Edit criteria — partner must own the wording before lock.`,
    );
    setError(null);
  };

  const applyLock = () => {
    if (!matchesOrderFormLockWord(lockWordInput)) {
      setError(`Lock word must be ${DESIGN_PARTNER_ORDER_FORM_LOCK_WORD} (partner confirmation).`);
      return;
    }
    if (!eligibility.ok) {
      setError(eligibility.reasons.join(" · "));
      return;
    }
    setLock(
      lockOrderForm(lock, {
        note: `Partner said/typed ${DESIGN_PARTNER_ORDER_FORM_LOCK_WORD}`,
      }),
    );
    setLockWordInput("");
    setBanner("Form locked. Commercial terms + criteria frozen for copy/send / signature path.");
    setError(null);
  };

  const applyUnlock = () => {
    try {
      setLock(unlockOrderForm(lock, unlockReason));
      setUnlockReason("");
      setBanner("Form unlocked for edit — re-confirm with lock word after changes.");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlock failed.");
    }
  };

  const copyMarkdown = async () => {
    setError(null);
    setCopyStatus("idle");
    if (!markdown.trim()) {
      setError("Nothing to copy — fill the form first.");
      setCopyStatus("failed");
      return;
    }
    const ok = await copyTextToClipboard(markdown);
    if (ok) {
      setCopyStatus("copied");
      setBanner("Copied order form markdown.");
      window.setTimeout(() => setCopyStatus("idle"), 2500);
      return;
    }
    setCopyStatus("failed");
    setError("Clipboard blocked — select the markdown below and copy manually (⌘/Ctrl+C).");
  };

  const fieldClass =
    "mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60";
  const labelClass = "block text-xs font-medium text-slate-400";

  return (
    <section className="space-y-4 rounded-xl border border-emerald-900/50 bg-emerald-950/15 p-4 sm:p-5">
      <header className="space-y-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400">
          Interactive order form · suggest ≠ bind
        </p>
        <h2 className="text-lg font-semibold text-white">Path B / Command Tier order form</h2>
        <p className="text-xs text-slate-400">
          Commercial locks ({formatPathBUsd()} · {DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day · convert
          credit · non-refundable) never come from the transcript. Use{" "}
          <strong className="text-slate-200">Suggest from call</strong> for drafts only. Partner
          confirms with lock word <code className="text-cyan-300">{DESIGN_PARTNER_ORDER_FORM_LOCK_WORD}</code>{" "}
          to freeze.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={suggestFromCall}
            disabled={frozen}
            className="rounded-lg bg-cyan-800 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            Suggest from call
          </button>
          <Link
            href="/dashboard/operations/workflow-review#after-yes"
            className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900"
          >
            LIVE desk
          </Link>
          <Link
            href="/admin/onboarding"
            className="rounded-lg border border-emerald-700/70 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-950/50"
          >
            Provision Path B (admin)
          </Link>
        </div>
        {banner ? (
          <p className="rounded-md border border-cyan-900/50 bg-cyan-950/30 px-3 py-2 text-xs text-cyan-100">
            {banner}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-md border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-xs text-rose-100">
            {error}
          </p>
        ) : null}
        {frozen ? (
          <p className="rounded-md border border-amber-700/50 bg-amber-950/40 px-3 py-2 text-xs text-amber-50">
            <strong>LOCKED</strong>
            {lock.lockedAt ? ` · ${lock.lockedAt}` : ""} — {lock.lockedByNote}
          </p>
        ) : null}
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Customer legal name
          <input
            className={fieldClass}
            value={draft.customerLegalName}
            disabled={frozen}
            onChange={(e) => patchDraft({ customerLegalName: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Billing contact
          <input
            className={fieldClass}
            value={draft.billingContactName}
            disabled={frozen}
            onChange={(e) => patchDraft({ billingContactName: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Billing email
          <input
            type="email"
            className={fieldClass}
            value={draft.billingEmail}
            disabled={frozen}
            onChange={(e) => patchDraft({ billingEmail: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Operator email (client-owned)
          <input
            type="email"
            className={fieldClass}
            placeholder="not @ironframegrc.com"
            value={draft.operatorEmail}
            disabled={frozen}
            onChange={(e) => patchDraft({ operatorEmail: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Workspace slug
          <div className="mt-1 flex items-center gap-1">
            <input
              className={fieldClass + " mt-0"}
              value={draft.workspaceSlug}
              disabled={frozen}
              onChange={(e) =>
                patchDraft({
                  workspaceSlug: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, ""),
                })
              }
            />
            <span className="shrink-0 text-xs text-slate-500">.ironframegrc.com</span>
          </div>
        </label>
        <label className={labelClass}>
          Effective date
          <input
            type="date"
            className={fieldClass}
            value={draft.effectiveDate}
            disabled={frozen}
            onChange={(e) => patchDraft({ effectiveDate: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Pilot window (days)
          <input
            type="number"
            min={DESIGN_PARTNER_MIN_WINDOW_DAYS}
            max={DESIGN_PARTNER_DEFAULT_WINDOW_DAYS + 30}
            className={fieldClass}
            value={draft.pilotWindowDays}
            disabled={frozen}
            onChange={(e) =>
              patchDraft({ pilotWindowDays: Number(e.target.value) || DESIGN_PARTNER_DEFAULT_WINDOW_DAYS })
            }
          />
        </label>
        <label className={labelClass}>
          Eng sync weeks (first)
          <input
            className={fieldClass}
            value={draft.engSyncWeeks}
            disabled={frozen}
            onChange={(e) => patchDraft({ engSyncWeeks: e.target.value })}
          />
        </label>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Commercial locks (read-only)
        </p>
        <ul className="mt-2 space-y-1 text-xs text-slate-300">
          <li>
            <strong className="text-slate-100">Fee:</strong> {ORDER_FORM_COMMERCIAL_LOCKS.feeLabel}
          </li>
          <li>
            <strong className="text-slate-100">Convert credit:</strong>{" "}
            {ORDER_FORM_COMMERCIAL_LOCKS.convertCreditLabel}
          </li>
          <li>
            <strong className="text-slate-100">Refunds:</strong> {ORDER_FORM_COMMERCIAL_LOCKS.refunds}
          </li>
          <li>
            <strong className="text-slate-100">Payment:</strong> {ORDER_FORM_COMMERCIAL_LOCKS.payment}
          </li>
        </ul>
      </div>

      <div className="space-y-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400">
          Success criteria (exactly 2 or 3) — partner-owned wording
        </p>
        {([0, 1, 2] as const).map((i) => (
          <label key={i} className={labelClass}>
            Criterion {i + 1}
            {i === 2 ? " (optional)" : ""}
            <textarea
              rows={2}
              className={fieldClass}
              value={draft.successCriteria[i]}
              disabled={frozen}
              onChange={(e) => setCriterion(i, e.target.value)}
            />
          </label>
        ))}
      </div>

      {!frozen ? (
        <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-3 space-y-2">
          <p className="text-xs text-amber-100">
            After partner reads back criteria + commercials, they say/type{" "}
            <code className="text-amber-50">{DESIGN_PARTNER_ORDER_FORM_LOCK_WORD}</code> to freeze.
          </p>
          {!eligibility.ok ? (
            <p className="text-[11px] text-amber-200/80">
              Before lock: {eligibility.reasons.join(" · ")}
            </p>
          ) : null}
          <div className="flex flex-wrap items-end gap-2">
            <label className={labelClass + " min-w-[10rem] flex-1"}>
              Lock word
              <input
                className={fieldClass}
                value={lockWordInput}
                placeholder={DESIGN_PARTNER_ORDER_FORM_LOCK_WORD}
                onChange={(e) => setLockWordInput(e.target.value)}
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              onClick={applyLock}
              className="rounded-lg bg-amber-700 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600"
            >
              Lock form
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3 space-y-2">
          <p className="text-xs text-slate-400">
            Unlock requires an audit reason, then re-lock with{" "}
            {DESIGN_PARTNER_ORDER_FORM_LOCK_WORD} after edits.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className={labelClass + " min-w-[12rem] flex-1"}>
              Unlock reason
              <input
                className={fieldClass}
                value={unlockReason}
                placeholder="e.g. Partner corrected criterion 2"
                onChange={(e) => setUnlockReason(e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={applyUnlock}
              className="rounded-lg border border-slate-500 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-900"
            >
              Unlock for edit
            </button>
          </div>
          {lock.unlockAudit.length > 0 ? (
            <ul className="text-[11px] text-slate-500 space-y-0.5">
              {lock.unlockAudit.map((row) => (
                <li key={`${row.at}-${row.reason}`}>
                  {row.at}: {row.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void copyMarkdown()}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
          >
            {copyStatus === "copied" ? "Copied ✓" : "Copy markdown"}
          </button>
          {copyStatus === "copied" ? (
            <span className="text-xs text-emerald-300">Markdown is on your clipboard.</span>
          ) : null}
          {copyStatus === "failed" ? (
            <span className="text-xs text-rose-300">Copy failed — use the preview below.</span>
          ) : null}
        </div>
        <pre
          tabIndex={0}
          className="max-h-64 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap focus:outline focus:outline-2 focus:outline-cyan-600"
          onFocus={(e) => {
            const selection = window.getSelection();
            if (!selection) return;
            const range = document.createRange();
            range.selectNodeContents(e.currentTarget);
            selection.removeAllRanges();
            selection.addRange(range);
          }}
        >
          {markdown}
        </pre>
        <p className="text-[10px] text-slate-500">
          Tip: click inside the preview to select all, then ⌘/Ctrl+C if the button is blocked.
        </p>
      </div>
    </section>
  );
}
