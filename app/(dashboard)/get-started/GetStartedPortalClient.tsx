"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useTenantContext } from "@/app/context/TenantProvider";
import { GET_STARTED_STEPS, type GetStartedStepId } from "@/app/lib/getStartedSteps";

const STORAGE_KEY = "ironframe-get-started-v1";
const DISMISS_KEY = "ironframe-get-started-dismissed";

const TRAINER_PROMPTS = [
  "How do I switch between tenant workspaces safely?",
  "What does the Integrity Hub ALE baseline represent?",
  "Where do I export audit evidence for my tenant?",
] as const;

type StoredProgress = Record<string, boolean>;

function readProgress(): StoredProgress {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredProgress;
  } catch {
    return {};
  }
}

function writeProgress(progress: StoredProgress): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export default function GetStartedPortalClient() {
  const { tenantFetch } = useTenantContext();
  const [progress, setProgress] = useState<StoredProgress>({});
  const [trainerTopic, setTrainerTopic] = useState("");
  const [trainerMessage, setTrainerMessage] = useState("");
  const [trainerReply, setTrainerReply] = useState<string | null>(null);
  const [trainerError, setTrainerError] = useState<string | null>(null);
  const [isTrainerBusy, setIsTrainerBusy] = useState(false);

  useEffect(() => {
    setProgress(readProgress());
  }, []);

  const completedCount = useMemo(
    () => GET_STARTED_STEPS.filter((step) => progress[step.id]).length,
    [progress],
  );
  const percentComplete = Math.round((completedCount / GET_STARTED_STEPS.length) * 100);
  const allComplete = completedCount === GET_STARTED_STEPS.length;

  const logProgress = useCallback(
    async (stepId: string, completed: boolean, markAllComplete = false) => {
      try {
        await tenantFetch("/api/get-started/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stepId,
            completed,
            allComplete: markAllComplete,
          }),
        });
      } catch (err) {
        console.error("[Get Started] progress log failed:", err);
      }
    },
    [tenantFetch],
  );

  const markStepComplete = useCallback(
    (stepId: GetStartedStepId) => {
      setProgress((prev) => {
        if (prev[stepId]) return prev;
        const next = { ...prev, [stepId]: true };
        writeProgress(next);
        const done = GET_STARTED_STEPS.every((step) => next[step.id]);
        void logProgress(stepId, true, done);
        return next;
      });
    },
    [logProgress],
  );

  const handleTrainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const topic = trainerTopic.trim();
    if (!topic || isTrainerBusy) return;

    setIsTrainerBusy(true);
    setTrainerError(null);
    setTrainerReply(null);

    try {
      const response = await tenantFetch("/api/agents/trainer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          message: trainerMessage.trim() || undefined,
        }),
      });

      const data = (await response.json()) as {
        lesson?: string;
        error?: string;
        details?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? data.details ?? "Trainer session failed.");
      }

      setTrainerReply(data.lesson ?? "Trainer returned an empty lesson payload.");
      markStepComplete("trainer-session");
    } catch (err) {
      setTrainerError(err instanceof Error ? err.message : "Trainer session failed.");
    } finally {
      setIsTrainerBusy(false);
    }
  };

  const handleDismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    if (allComplete) {
      void logProgress("portal-complete", true, true);
    }
  };

  const videoUrl = process.env.NEXT_PUBLIC_GET_STARTED_VIDEO_URL?.trim();

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-[#020617] p-4 text-slate-100 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />

      <div className="relative z-10 mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-800/80 pb-6 lg:flex-row lg:items-end">
          <div>
            <div className="mb-1 font-mono text-[10px] tracking-widest text-cyan-400 uppercase">
              Command Post Initialization
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Get Started Portal</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Progressive onboarding for design partners — quick-start docs, Level 1 curriculum, and
              the isolated Trainer sandbox. Completion events log to your tenant training audit trail.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 font-mono text-xs">
            <div className="text-slate-500 uppercase">Progress</div>
            <div className="mt-1 text-lg font-bold text-cyan-400">{percentComplete}%</div>
            <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-slate-900">
              <div
                className="h-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <aside className="space-y-4 lg:col-span-3">
            <div className="rounded-xl border border-slate-800/80 bg-[#070e20]/40 p-4">
              <h2 className="font-mono text-[10px] tracking-widest text-indigo-400 uppercase">
                Tactical video
              </h2>
              {videoUrl ? (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-950/30 px-4 font-sans text-xs font-semibold text-indigo-200 transition hover:bg-indigo-950/50"
                >
                  Watch 3-minute tour
                </a>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                  Orientation screencast will be linked here by your delivery engineer. Use the
                  checklist and Trainer panel to complete initialization today.
                </p>
              )}
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 text-xs text-emerald-200/90">
              <strong className="font-mono text-[10px] uppercase tracking-wide text-emerald-400">
                Audit evidence
              </strong>
              <p className="mt-2 leading-relaxed text-emerald-100/80">
                Checklist and Trainer completions write <code className="text-emerald-300">TRAINING_ONBOARDING</code>{" "}
                entries to your tenant agent log for security awareness training exports.
              </p>
            </div>
          </aside>

          <section className="space-y-3 lg:col-span-5">
            <h2 className="font-mono text-[10px] tracking-widest text-slate-500 uppercase">
              Mission checklist
            </h2>
            {GET_STARTED_STEPS.map((step, index) => {
              const done = Boolean(progress[step.id]);
              return (
                <article
                  key={step.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    done
                      ? "border-emerald-500/30 bg-emerald-950/10"
                      : "border-slate-800/80 bg-[#070e20]/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold ${
                        done ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {done ? "✓" : index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-sans text-sm font-semibold text-white">{step.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{step.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {step.href.startsWith("/get-started") ? null : (
                          <Link
                            href={step.href}
                            onClick={() => markStepComplete(step.id)}
                            className="inline-flex h-9 items-center rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-3 font-mono text-[10px] font-bold tracking-wide text-cyan-300 uppercase transition hover:bg-cyan-950/40"
                          >
                            {step.docLabel}
                          </Link>
                        )}
                        {!done ? (
                          <button
                            type="button"
                            onClick={() => markStepComplete(step.id)}
                            className="inline-flex h-9 items-center rounded-lg border border-slate-700 px-3 font-mono text-[10px] text-slate-400 uppercase transition hover:border-slate-500 hover:text-slate-200"
                          >
                            Mark complete
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <section
            id="trainer-sandbox"
            className="rounded-xl border border-slate-800/80 bg-[#070e20]/30 p-4 lg:col-span-4"
          >
            <h2 className="font-mono text-[10px] tracking-widest text-cyan-400 uppercase">
              Trainer agent sandbox
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Corpus-locked to Level 1 training manuals. Not connected to the live boardroom.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {TRAINER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setTrainerTopic(prompt);
                    setTrainerMessage("");
                  }}
                  className="rounded border border-slate-800 bg-slate-950/40 px-2 py-1 font-sans text-[10px] text-slate-400 transition hover:border-cyan-500/40 hover:text-cyan-300"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form onSubmit={handleTrainerSubmit} className="mt-4 space-y-3">
              <input
                type="text"
                value={trainerTopic}
                onChange={(e) => setTrainerTopic(e.target.value)}
                placeholder="Training topic (required)"
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-cyan-500"
              />
              <textarea
                value={trainerMessage}
                onChange={(e) => setTrainerMessage(e.target.value)}
                placeholder="Optional follow-up detail"
                className="h-20 w-full resize-none rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-white outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={!trainerTopic.trim() || isTrainerBusy}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-cyan-600 font-sans text-xs font-bold tracking-wide text-slate-950 uppercase transition hover:bg-cyan-500 disabled:bg-slate-900 disabled:text-slate-600"
              >
                {isTrainerBusy ? "Synthesizing lesson..." : "Ask Trainer"}
              </button>
            </form>

            {trainerError ? (
              <p className="mt-3 rounded-lg border border-red-900/40 bg-red-950/20 p-3 text-xs text-red-300">
                {trainerError}
              </p>
            ) : null}

            {trainerReply ? (
              <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs leading-relaxed whitespace-pre-wrap text-slate-200">
                {trainerReply}
              </div>
            ) : null}
          </section>
        </div>

        <footer className="flex flex-col items-stretch justify-between gap-3 border-t border-slate-900 pt-4 sm:flex-row sm:items-center">
          <p className="font-mono text-[10px] text-slate-500">
            {allComplete
              ? "Initialization complete — proceed to live command surfaces."
              : `${GET_STARTED_STEPS.length - completedCount} steps remaining.`}
          </p>
          <div className="flex gap-2">
            <Link
              href="/integrity"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-700 px-5 font-mono text-xs text-slate-300 uppercase transition hover:border-slate-500"
            >
              Skip to Integrity Hub
            </Link>
            {allComplete ? (
              <Link
                href="/integrity"
                onClick={handleDismiss}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-6 font-sans text-xs font-bold tracking-wide text-white uppercase transition hover:bg-indigo-500"
              >
                Enter Command Post
              </Link>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}
