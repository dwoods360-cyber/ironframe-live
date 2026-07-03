"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useTenantContext } from "@/app/context/TenantProvider";
import { TRAINER_SUGGESTED_PROMPTS } from "@/app/lib/trainerAgentPrompts";
import {
  normalizeTrainerLesson,
  useTrainerAgentSessionStore,
  type TrainerSessionTurn,
} from "@/app/store/trainerAgentSessionStore";
import { isBenignRuntimeEmissionError } from "@/app/utils/safeRuntimeEmission";

type Props = {
  onLessonReceived?: () => void;
  className?: string;
  /** Drawer layout: full column scrolls inside the drawer body. */
  persistSession?: boolean;
};

const INPUT_CLASS =
  "h-11 w-full rounded-lg border border-slate-600 bg-[#0a1628] px-3 text-sm text-white shadow-inner outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30";

function resolveTrainerFetchError(response: Response, data: { error?: string; details?: string }): string {
  if (response.status === 401) {
    return "Tenant context required. Select a workspace in the tenant switcher, then retry.";
  }
  if (response.status === 403) {
    return "Workspace scope mismatch. Hard refresh this tenant URL or re-select your workspace, then retry.";
  }
  if (response.status === 503) {
    return data.error ?? "Trainer engine offline. Intelligence cluster keys unassigned.";
  }
  return data.error ?? data.details ?? "Trainer session failed.";
}

export default function TrainerAgentSessionForm({
  onLessonReceived,
  className = "",
  persistSession = false,
}: Props) {
  const { tenantFetch, activeTenantUuid } = useTenantContext();
  const persistedTurns = useTrainerAgentSessionStore((s) => s.turns);
  const appendPersistedTurn = useTrainerAgentSessionStore((s) => s.appendTurn);

  const [localTurns, setLocalTurns] = useState<TrainerSessionTurn[]>([]);
  const turns = persistSession ? persistedTurns : localTurns;

  const [topic, setTopic] = useState("");
  const [detail, setDetail] = useState("");
  const [pendingTopic, setPendingTopic] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  const appendTurn = useCallback(
    (turn: TrainerSessionTurn) => {
      if (persistSession) {
        appendPersistedTurn(turn);
        return;
      }
      setLocalTurns((prev) => [...prev, turn]);
    },
    [appendPersistedTurn, persistSession],
  );

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, pendingTopic, error, isBusy]);

  const submitTopic = useCallback(
    async (topicOverride?: string) => {
      const trimmedTopic = (topicOverride ?? topic).trim();
      if (!trimmedTopic || isBusy) return;

      if (!activeTenantUuid) {
        setError("No workspace tenant is bound. Wait for the dashboard to finish loading, then retry.");
        return;
      }

      setIsBusy(true);
      setPendingTopic(trimmedTopic);
      setError(null);

      try {
        const response = await tenantFetch("/api/agents/trainer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: trimmedTopic,
            message: detail.trim() || undefined,
          }),
        });

        let data: { lesson?: string; error?: string; details?: string } = {};
        try {
          data = (await response.json()) as typeof data;
        } catch {
          throw new Error("Trainer returned a non-JSON response. Retry in a moment.");
        }

        if (!response.ok) {
          throw new Error(resolveTrainerFetchError(response, data));
        }

        const lesson = normalizeTrainerLesson(data.lesson);
        appendTurn({
          id: `turn_${Date.now()}`,
          topic: trimmedTopic,
          lesson,
        });
        setTopic("");
        setDetail("");
        onLessonReceived?.();
      } catch (err) {
        if (isBenignRuntimeEmissionError(err)) {
          setError("Connection interrupted while synthesizing the lesson. Retry your question.");
          return;
        }
        setError(err instanceof Error ? err.message : "Trainer session failed.");
      } finally {
        setPendingTopic(null);
        setIsBusy(false);
      }
    },
    [activeTenantUuid, appendTurn, detail, isBusy, onLessonReceived, tenantFetch, topic],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void submitTopic();
    },
    [submitTopic],
  );

  const transcriptPanel = (
    <div
      className="space-y-3 rounded-lg border border-slate-700/80 bg-[#050b18] p-3 min-h-[8rem]"
      aria-live="polite"
      aria-busy={isBusy}
    >
      {turns.length === 0 && !pendingTopic && !error ? (
        <p className="text-xs leading-relaxed text-slate-400">
          Trainer responses appear below your question after you submit.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-900/40 bg-red-950/20 p-3 text-xs text-red-300">{error}</p>
      ) : null}

      {pendingTopic ? (
        <article className="rounded-lg border border-cyan-900/40 bg-cyan-950/10 p-3 text-xs text-cyan-200/90">
          <p className="font-mono text-[9px] uppercase tracking-widest text-cyan-400">{pendingTopic}</p>
          <p className="mt-2 text-slate-400">Synthesizing grounded lesson from training corpus…</p>
        </article>
      ) : null}

      {turns.map((turn) => (
        <article
          key={turn.id}
          className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs leading-relaxed text-slate-200"
        >
          <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-cyan-400">{turn.topic}</p>
          <div className="whitespace-pre-wrap">{turn.lesson}</div>
        </article>
      ))}
    </div>
  );

  const composerPanel = (
    <div data-trainer-composer className="space-y-3 border-t border-slate-700 pt-4 pb-2">
      <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-400">Your question</p>

      <div className="flex flex-wrap gap-2">
        {TRAINER_SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={isBusy || !activeTenantUuid}
            onClick={() => {
              setTopic(prompt);
              setDetail("");
              void submitTopic(prompt);
            }}
            className="min-h-9 rounded border border-slate-700 bg-[#0a1628] px-2.5 py-1.5 text-left font-sans text-[10px] text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-200 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor="trainer-topic-input"
            className="block text-[10px] font-medium uppercase tracking-wide text-slate-400"
          >
            Training topic
          </label>
          <input
            id="trainer-topic-input"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Example: How do I enter a threat manually?"
            className={INPUT_CLASS}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="trainer-detail-input"
            className="block text-[10px] font-medium uppercase tracking-wide text-slate-400"
          >
            Optional detail
          </label>
          <textarea
            id="trainer-detail-input"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Add context for a more specific lesson"
            className={`${INPUT_CLASS} h-20 resize-none py-2.5`}
          />
        </div>
        <button
          type="submit"
          disabled={!topic.trim() || isBusy || !activeTenantUuid}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-cyan-600 font-sans text-xs font-bold tracking-wide text-slate-950 uppercase transition hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500"
        >
          {isBusy ? "Synthesizing lesson..." : "Ask Trainer"}
        </button>
      </form>
    </div>
  );

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <p className="text-[10px] leading-relaxed text-slate-500">
        Corpus-locked to Level 1 training manuals. Not connected to the live boardroom.
      </p>

      {!activeTenantUuid ? (
        <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 text-xs text-amber-200">
          Resolving workspace tenant scope… Ask Trainer will unlock once the command post finishes loading.
        </p>
      ) : null}

      {composerPanel}
      {transcriptPanel}
      <div ref={scrollAnchorRef} aria-hidden className="h-px shrink-0" />
    </div>
  );
}
