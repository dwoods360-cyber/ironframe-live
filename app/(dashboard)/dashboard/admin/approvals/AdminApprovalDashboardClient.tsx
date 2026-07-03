"use client";

import { useCallback, useEffect, useState } from "react";

interface PendingDraft {
  id: string;
  contactName: string;
  company: string;
  subject: string;
  incomingQuery: string;
  proposedReply: string;
  tier: "Gridcore" | "Vaultbank" | "Medshield";
  draftKind: "SUPPORT" | "SALES";
}

export default function AdminApprovalDashboard() {
  const [drafts, setDrafts] = useState<PendingDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/admin/approvals", { cache: "no-store" });
      const data = (await response.json()) as { drafts?: PendingDraft[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load approval queue.");
      }
      const nextDrafts = data.drafts ?? [];
      setDrafts(nextDrafts);
      setActiveDraftId((current) => {
        if (current && nextDrafts.some((draft) => draft.id === current)) return current;
        return nextDrafts[0]?.id ?? null;
      });
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

  const selectedDraft = drafts.find((draft) => draft.id === activeDraftId);

  const handleUpdateDraftText = (newText: string) => {
    if (!activeDraftId) return;
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.id === activeDraftId ? { ...draft, proposedReply: newText } : draft,
      ),
    );
  };

  const handleAction = async (actionType: "DISPATCH" | "PURGE") => {
    if (!selectedDraft || isDispatching) return;
    setIsDispatching(true);

    try {
      const response = await fetch(`/api/admin/approvals/${selectedDraft.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          adjustedText: selectedDraft.proposedReply,
        }),
      });

      const data = (await response.json()) as { error?: string; status?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Workflow authorization error.");
      }
      if (data.status !== "SUCCESS_DISPATCHED" && data.status !== "SUCCESS_PURGED") {
        throw new Error("Unexpected workflow completion state.");
      }

      const remaining = drafts.filter((draft) => draft.id !== selectedDraft.id);
      setDrafts(remaining);
      setActiveDraftId(remaining[0]?.id ?? null);
    } catch (err) {
      console.error("Workflow authorization error:", err);
    } finally {
      setIsDispatching(false);
    }
  };

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
          </div>
          <div className="flex gap-2 font-mono">
            <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-2 text-center">
              <div className="text-[10px] uppercase text-slate-500">Pending Queue</div>
              <div className="text-lg font-bold text-cyan-400">{drafts.length}</div>
            </div>
          </div>
        </header>

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
                Active Review Queue
              </div>
              {drafts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center font-sans text-xs text-slate-500">
                  All message tracks cleared. Gatekeeper queue idle.
                </div>
              ) : (
                drafts.map((draft) => (
                  <button
                    key={draft.id}
                    type="button"
                    onClick={() => setActiveDraftId(draft.id)}
                    className={`block w-full touch-manipulation rounded-xl border p-4 text-left transition-all active:scale-[0.99] ${
                      draft.id === activeDraftId
                        ? "border-indigo-500 bg-slate-900 shadow-md shadow-indigo-950/20"
                        : "border-slate-800/80 bg-[#070e20]/40 hover:border-slate-700"
                    }`}
                  >
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <span className="truncate font-sans text-xs font-bold text-white">
                        {draft.company}
                      </span>
                      <div className="flex shrink-0 gap-1">
                        <span
                          className={`rounded border px-2 py-0.5 font-mono text-[9px] uppercase ${
                            draft.draftKind === "SALES"
                              ? "border-amber-800/40 bg-amber-950/40 text-amber-400"
                              : "border-indigo-800/40 bg-indigo-950/40 text-indigo-400"
                          }`}
                        >
                          {draft.draftKind}
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
                    <div className="mb-1 line-clamp-1 font-sans text-xs font-medium text-slate-300">
                      {draft.subject}
                    </div>
                    <div className="truncate font-mono text-[10px] text-slate-500">
                      Operator: {draft.contactName}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="lg:col-span-8">
              {selectedDraft ? (
                <div className="animate-fadeIn space-y-5 rounded-xl border border-slate-800/80 bg-[#070e20]/20 p-5 backdrop-blur-md sm:p-6">
                  <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800/60 bg-slate-950/60 p-4 font-sans text-xs sm:grid-cols-2">
                    <div>
                      <span className="block font-mono text-[9px] uppercase text-slate-500">
                        Recipient Entity
                      </span>
                      <strong className="text-sm text-white">{selectedDraft.contactName}</strong>
                      <span className="block text-[11px] text-slate-400">{selectedDraft.company}</span>
                    </div>
                    <div>
                      <span className="block font-mono text-[9px] uppercase text-slate-500">
                        Transport Tracking Subject
                      </span>
                      <span className="mt-1 block font-medium text-slate-200">
                        {selectedDraft.subject}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="block font-mono text-[10px] uppercase text-slate-500">
                      Inbound Context Payload
                    </span>
                    <div className="rounded-lg border border-slate-900 bg-slate-950/20 p-3 font-sans text-xs italic leading-relaxed text-slate-400">
                      &ldquo;{selectedDraft.incomingQuery}&rdquo;
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase text-cyan-400">
                        Proposed Resolution Content
                      </span>
                      <span className="font-mono text-[9px] text-slate-500">
                        {"// Editable Workspace Field"}
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
                      Purge Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAction("DISPATCH")}
                      disabled={isDispatching}
                      className="flex h-11 w-full touch-manipulation items-center justify-center rounded-lg bg-indigo-600 px-8 font-sans text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-indigo-950/40 transition-all duration-150 hover:bg-indigo-500 active:scale-[0.98] disabled:bg-slate-900 disabled:text-slate-600 sm:w-auto"
                    >
                      {isDispatching
                        ? "Authorizing Pipeline Delivery..."
                        : "Approve & Dispatch"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center font-sans text-sm text-slate-500">
                  Select an engineering track item from the queue matrix to initialize verification
                  steps.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
