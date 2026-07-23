"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import {
  APPROVAL_DRAFT_KINDS,
  APPROVAL_KIND_META,
  approvalsHref,
  draftKindBadgeClass,
  draftKindBannerClass,
  draftKindCardClass,
  parseApprovalKindFilter,
  type ApprovalDraftKind,
  type ApprovalKindFilter,
} from "@/app/lib/approvalDraftKinds";

type DispatchChannel = "EMAIL" | "SMS";

interface PendingDraft {
  id: string;
  contactName: string;
  company: string;
  subject: string;
  incomingQuery: string;
  proposedReply: string;
  tier: "Gridcore" | "Vaultbank" | "Medshield";
  draftKind: ApprovalDraftKind;
  contactEmail: string;
  contactPhone: string | null;
  dispatchChannel: DispatchChannel;
}

function kindSortRank(kind: ApprovalDraftKind): number {
  if (kind === "SALES") return 0;
  if (kind === "SUPPORT") return 1;
  return 2;
}

function AdminApprovalDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kindFilter = parseApprovalKindFilter(searchParams.get("kind"));

  const [drafts, setDrafts] = useState<PendingDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/admin/approvals", { cache: "no-store" });
      const data = (await response.json()) as { drafts?: PendingDraft[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load approval queue.");
      }
      const nextDrafts: PendingDraft[] = [...(data.drafts ?? [])]
        .map((draft) => ({
          ...draft,
          contactEmail: draft.contactEmail ?? "",
          contactPhone: draft.contactPhone ?? null,
          dispatchChannel: (draft.dispatchChannel === "SMS" ? "SMS" : "EMAIL") as DispatchChannel,
        }))
        .sort((a, b) => kindSortRank(a.draftKind) - kindSortRank(b.draftKind));
      setDrafts(nextDrafts);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Queue load failure.");
      setDrafts([]);
      setActiveDraftId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const counts = useMemo(() => {
    const next = { SALES: 0, SUPPORT: 0, CUSTOMER_SUCCESS: 0, ALL: drafts.length };
    for (const draft of drafts) next[draft.draftKind] += 1;
    return next;
  }, [drafts]);

  const visibleDrafts = useMemo(() => {
    if (kindFilter === "ALL") return drafts;
    return drafts.filter((draft) => draft.draftKind === kindFilter);
  }, [drafts, kindFilter]);

  useEffect(() => {
    setActiveDraftId((current) => {
      if (current && visibleDrafts.some((draft) => draft.id === current)) return current;
      return visibleDrafts[0]?.id ?? null;
    });
  }, [visibleDrafts]);

  const selectedDraft = visibleDrafts.find((draft) => draft.id === activeDraftId);
  const selectedMeta = selectedDraft ? APPROVAL_KIND_META[selectedDraft.draftKind] : null;

  const setKindFilter = (next: ApprovalKindFilter) => {
    router.replace(approvalsHref(next), { scroll: false });
  };

  const patchSelectedDraft = (patch: Partial<PendingDraft>) => {
    if (!activeDraftId) return;
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === activeDraftId ? { ...draft, ...patch } : draft)),
    );
  };

  const handleUpdateDraftText = (newText: string) => {
    patchSelectedDraft({ proposedReply: newText });
  };

  const handleAction = async (actionType: "DISPATCH" | "PURGE") => {
    if (!selectedDraft || isDispatching) return;
    setIsDispatching(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch(`/api/admin/approvals/${selectedDraft.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          adjustedText: selectedDraft.proposedReply,
          recipientEmail: selectedDraft.contactEmail,
          recipientPhone: selectedDraft.contactPhone,
          dispatchChannel: selectedDraft.dispatchChannel,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        status?: string;
        channel?: string;
        to?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Workflow authorization error.");
      }
      if (data.status !== "SUCCESS_DISPATCHED" && data.status !== "SUCCESS_PURGED") {
        throw new Error("Unexpected workflow completion state.");
      }

      if (data.status === "SUCCESS_DISPATCHED") {
        setActionSuccess(
          `SUCCESS_DISPATCHED via ${data.channel ?? selectedDraft.dispatchChannel}${
            data.to ? ` → ${data.to}` : ""
          }`,
        );
      } else {
        setActionSuccess("SUCCESS_PURGED");
      }

      setDrafts((prev) => prev.filter((draft) => draft.id !== selectedDraft.id));
    } catch (err) {
      console.error("Workflow authorization error:", err);
      setActionError(err instanceof Error ? err.message : "Workflow authorization error.");
    } finally {
      setIsDispatching(false);
    }
  };

  const filterTitle =
    kindFilter === "ALL" ? "All messaging tracks" : APPROVAL_KIND_META[kindFilter].title;

  return (
    <div className="relative min-h-screen bg-[#020617] p-4 text-slate-100 sm:p-6">
      <div className="relative z-10 mx-auto w-full max-w-7xl space-y-6">
        <header className="flex flex-col items-start justify-between gap-4 border-b border-slate-800/80 pb-6 md:flex-row md:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-indigo-400">
              <span>HUMAN-IN-THE-LOOP CORE</span>
              <span>·</span>
              <span className="text-amber-400">GATEKEEPER_REQUIRED</span>
            </div>
            <h1 className="font-sans text-2xl font-bold tracking-tight text-white">
              Agent Messaging Approvals
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              One desk for every outbound that can reach a human. Filter by track — Sales outreach,
              Support replies, and Customer Success advisories are different messages, not the same
              workflow.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/operations/workflow-review#talk-track"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-teal-800/50 bg-teal-950/40 px-4 py-2 text-sm font-medium text-teal-100 hover:border-teal-500"
            >
              Workflow review talk track
            </Link>
            <Link
              href="/dashboard/operations/library/icp-shortlist#section-d"
              className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-2 text-sm text-amber-100 hover:border-amber-600"
              title="C3 — log DISPATCH touch on ICP shortlist §D"
            >
              C3 · Log touch (§D)
            </Link>
            <Link
              href="/dashboard/operations"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-600"
            >
              ← Operations hub
            </Link>
            <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-2 text-center font-mono">
              <div className="text-[10px] uppercase text-slate-500">Showing</div>
              <div className="text-lg font-bold text-cyan-400">{visibleDrafts.length}</div>
              <div className="text-[9px] text-slate-500">of {drafts.length} total</div>
            </div>
          </div>
        </header>

        <div
          className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-2"
          role="tablist"
          aria-label="Approval track filter"
        >
          <button
            type="button"
            role="tab"
            aria-selected={kindFilter === "ALL"}
            onClick={() => setKindFilter("ALL")}
            className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              kindFilter === "ALL"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            }`}
          >
            <span className="font-medium">All tracks</span>
            <span className="ml-2 font-mono text-xs text-slate-500">{counts.ALL}</span>
          </button>
          {APPROVAL_DRAFT_KINDS.map((kind) => {
            const meta = APPROVAL_KIND_META[kind];
            const active = kindFilter === kind;
            const tone =
              kind === "SALES"
                ? active
                  ? "bg-amber-900/50 text-amber-100 ring-1 ring-amber-600/50"
                  : "text-amber-300/80 hover:bg-amber-950/40"
                : kind === "SUPPORT"
                  ? active
                    ? "bg-emerald-900/50 text-emerald-100 ring-1 ring-emerald-600/50"
                    : "text-emerald-300/80 hover:bg-emerald-950/40"
                  : active
                    ? "bg-violet-900/50 text-violet-100 ring-1 ring-violet-600/50"
                    : "text-violet-300/80 hover:bg-violet-950/40";
            return (
              <button
                key={kind}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setKindFilter(kind)}
                className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${tone}`}
              >
                <span className="font-medium">{meta.tabLabel}</span>
                <span className="ml-2 font-mono text-xs opacity-70">{counts[kind]}</span>
              </button>
            );
          })}
        </div>

        {kindFilter !== "ALL" ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${draftKindBannerClass(kindFilter)}`}
          >
            <div className="font-semibold">
              {APPROVAL_KIND_META[kindFilter].title} track
            </div>
            <div className="mt-1 text-xs opacity-90">
              Source: {APPROVAL_KIND_META[kindFilter].source}.{" "}
              {APPROVAL_KIND_META[kindFilter].dispatchMeans}
            </div>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {APPROVAL_DRAFT_KINDS.map((kind) => {
              const meta = APPROVAL_KIND_META[kind];
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setKindFilter(kind)}
                  className={`rounded-xl border px-3 py-3 text-left text-xs transition-colors ${draftKindBannerClass(kind)} hover:opacity-95`}
                >
                  <div className="font-mono text-[10px] uppercase tracking-wider opacity-80">
                    {meta.shortLabel} · {counts[kind]} pending
                  </div>
                  <div className="mt-1 font-semibold">{meta.title}</div>
                  <div className="mt-1 opacity-80">{meta.source}</div>
                </button>
              );
            })}
          </div>
        )}

        {loadError ? (
          <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300">
            {loadError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
            Synchronizing gatekeeper queue from CRM ledger...
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-4">
              <div className="px-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                {filterTitle} · review queue
              </div>
              {visibleDrafts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center font-sans text-xs text-slate-500">
                  No pending drafts in this track.
                  {kindFilter !== "ALL" ? (
                    <>
                      {" "}
                      <button
                        type="button"
                        className="text-cyan-400 hover:underline"
                        onClick={() => setKindFilter("ALL")}
                      >
                        Show all tracks
                      </button>
                    </>
                  ) : null}
                </div>
              ) : (
                visibleDrafts.map((draft) => {
                  const meta = APPROVAL_KIND_META[draft.draftKind];
                  const selected = draft.id === activeDraftId;
                  return (
                    <button
                      key={draft.id}
                      type="button"
                      onClick={() => setActiveDraftId(draft.id)}
                      className={`block w-full touch-manipulation rounded-xl border-l-4 border p-4 text-left transition-all active:scale-[0.99] ${draftKindCardClass(draft.draftKind, selected)}`}
                    >
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <span className="truncate font-sans text-xs font-bold text-white">
                          {draft.company}
                        </span>
                        <div className="flex shrink-0 flex-wrap justify-end gap-1">
                          <span
                            className={`rounded border px-2 py-0.5 font-mono text-[9px] uppercase ${draftKindBadgeClass(draft.draftKind)}`}
                            title={meta.title}
                          >
                            {meta.shortLabel}
                          </span>
                          <span
                            className={`rounded border px-2 py-0.5 font-mono text-[9px] uppercase ${
                              draft.tier === "Medshield"
                                ? "border-cyan-800/40 bg-cyan-950/40 text-cyan-400"
                                : draft.tier === "Vaultbank"
                                  ? "border-purple-800/40 bg-purple-950/40 text-purple-400"
                                  : "border-slate-700 bg-slate-800 text-slate-400"
                            }`}
                          >
                            {draft.tier}
                          </span>
                        </div>
                      </div>
                      <div className="mb-1 font-mono text-[9px] uppercase tracking-wide text-slate-500">
                        {meta.title}
                      </div>
                      <div className="mb-1 line-clamp-1 font-sans text-xs font-medium text-slate-300">
                        {draft.subject}
                      </div>
                      <div className="truncate font-mono text-[10px] text-slate-500">
                        Operator: {draft.contactName}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="lg:col-span-8">
              {selectedDraft && selectedMeta ? (
                <div className="animate-fadeIn space-y-5 rounded-xl border border-slate-800/80 bg-[#070e20]/20 p-5 backdrop-blur-md sm:p-6">
                  <div
                    className={`rounded-xl border px-4 py-3 text-sm ${draftKindBannerClass(selectedDraft.draftKind)}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${draftKindBadgeClass(selectedDraft.draftKind)}`}
                      >
                        {selectedMeta.shortLabel}
                      </span>
                      <strong>{selectedMeta.title}</strong>
                    </div>
                    <p className="mt-1 text-xs opacity-90">
                      Queued by {selectedMeta.source}. {selectedMeta.dispatchMeans}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800/60 bg-slate-950/60 p-4 font-sans text-xs sm:grid-cols-2">
                    <div>
                      <span className="block font-mono text-[9px] uppercase text-slate-500">
                        Recipient
                      </span>
                      <strong className="text-sm text-white">{selectedDraft.contactName}</strong>
                      <span className="block text-[11px] text-slate-400">{selectedDraft.company}</span>
                    </div>
                    <div>
                      <span className="block font-mono text-[9px] uppercase text-slate-500">
                        Subject
                      </span>
                      <span className="mt-1 block font-medium text-slate-200">
                        {selectedDraft.subject}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl border border-amber-900/30 bg-amber-950/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                        Destination (editable before DISPATCH)
                      </span>
                      <span className="font-mono text-[9px] text-slate-500">
                        Dry-run: set your inbox / test phone here
                      </span>
                    </div>
                    {selectedDraft.draftKind === "SALES" ? (
                      <div className="flex flex-wrap gap-2">
                        {(["EMAIL", "SMS"] as const).map((channel) => {
                          const active = selectedDraft.dispatchChannel === channel;
                          return (
                            <button
                              key={channel}
                              type="button"
                              onClick={() => patchSelectedDraft({ dispatchChannel: channel })}
                              className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide transition-colors ${
                                active
                                  ? "border-amber-500/60 bg-amber-600/30 text-amber-100"
                                  : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-slate-500"
                              }`}
                            >
                              {channel}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="font-mono text-[9px] uppercase text-slate-500">
                          To email
                          {selectedDraft.draftKind === "SALES" &&
                          selectedDraft.dispatchChannel === "SMS"
                            ? " (inactive while SMS selected)"
                            : ""}
                        </span>
                        <input
                          type="email"
                          value={selectedDraft.contactEmail}
                          onChange={(event) =>
                            patchSelectedDraft({ contactEmail: event.target.value })
                          }
                          className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 font-sans text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          placeholder="you@example.com"
                          autoComplete="off"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="font-mono text-[9px] uppercase text-slate-500">
                          To phone (E.164)
                          {selectedDraft.draftKind === "SALES" &&
                          selectedDraft.dispatchChannel === "EMAIL"
                            ? " — select SMS above to use this on DISPATCH"
                            : ""}
                        </span>
                        <input
                          type="tel"
                          value={selectedDraft.contactPhone ?? ""}
                          onChange={(event) =>
                            patchSelectedDraft({
                              contactPhone: event.target.value.trim() || null,
                            })
                          }
                          disabled={selectedDraft.draftKind !== "SALES"}
                          className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 font-sans text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-40"
                          placeholder="+15551234567"
                          autoComplete="off"
                        />
                      </label>
                    </div>
                    {selectedDraft.draftKind === "SALES" &&
                    selectedDraft.dispatchChannel === "EMAIL" ? (
                      <p className="font-mono text-[10px] text-amber-200/80">
                        Channel is EMAIL — phone field is editable for prep, but DISPATCH will use
                        email until you switch to SMS.
                      </p>
                    ) : null}
                    {selectedDraft.draftKind === "SALES" &&
                    selectedDraft.dispatchChannel === "SMS" ? (
                      <p className="font-mono text-[10px] text-amber-200/80">
                        Channel is SMS — set your dry-run E.164 phone (not the prospect switchboard)
                        before DISPATCH.
                      </p>
                    ) : null}
                  </div>

                  {actionError ? (
                    <div className="rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 font-sans text-xs text-red-300">
                      {actionError}
                    </div>
                  ) : null}
                  {actionSuccess ? (
                    <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 font-sans text-xs text-emerald-300">
                      {actionSuccess}
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <span className="block font-mono text-[10px] uppercase text-slate-500">
                      Inbound / trigger context
                    </span>
                    <div className="rounded-lg border border-slate-900 bg-slate-950/20 p-3 font-sans text-xs italic leading-relaxed text-slate-400">
                      &ldquo;{selectedDraft.incomingQuery}&rdquo;
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase text-cyan-400">
                        Proposed {selectedDraft.draftKind === "SALES" ? "outreach" : "reply"}
                      </span>
                      <span className="font-mono text-[9px] text-slate-500">
                        Editable before DISPATCH
                      </span>
                    </div>
                    <textarea
                      value={selectedDraft.proposedReply}
                      onChange={(event) => handleUpdateDraftText(event.target.value)}
                      className="h-44 w-full resize-none rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-sans text-sm font-normal leading-relaxed text-slate-200 shadow-inner outline-none transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="mt-2 flex flex-col items-center justify-end gap-3 border-t border-slate-900 pt-4 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void handleAction("PURGE")}
                      disabled={isDispatching}
                      className="h-11 w-full touch-manipulation rounded-lg border border-red-900/30 bg-red-950/10 px-5 font-sans text-xs font-bold uppercase tracking-wide text-red-400 transition-colors duration-150 hover:bg-red-950/30 active:scale-95 disabled:opacity-40 sm:w-auto"
                    >
                      Purge draft
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAction("DISPATCH")}
                      disabled={isDispatching}
                      className={`flex h-11 w-full touch-manipulation items-center justify-center rounded-lg px-8 font-sans text-xs font-bold uppercase tracking-wide text-white shadow-lg transition-all duration-150 active:scale-[0.98] disabled:bg-slate-900 disabled:text-slate-600 sm:w-auto ${
                        selectedDraft.draftKind === "SALES"
                          ? "bg-amber-600 shadow-amber-950/40 hover:bg-amber-500"
                          : selectedDraft.draftKind === "SUPPORT"
                            ? "bg-emerald-600 shadow-emerald-950/40 hover:bg-emerald-500"
                            : "bg-violet-600 shadow-violet-950/40 hover:bg-violet-500"
                      }`}
                    >
                      {isDispatching
                        ? "Authorizing delivery…"
                        : `Approve & dispatch ${selectedMeta.shortLabel}`}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center font-sans text-sm text-slate-500">
                  Select a draft from the {filterTitle.toLowerCase()} queue to edit and dispatch.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminApprovalDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] p-8 text-center text-sm text-slate-500">
          Loading approvals desk…
        </div>
      }
    >
      <AdminApprovalDashboardInner />
    </Suspense>
  );
}
