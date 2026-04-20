"use client";

import { useEffect, useLayoutEffect, useMemo, useState, useTransition } from "react";
import { getDiagnosticsGitRevisionAction } from "@/app/actions/diagnosticsContextActions";
import { submitOperationalDeficiencyReportAction } from "@/app/actions/operationalDeficiencyActions";
import { buildGeminiRepairPacket } from "@/app/lib/diagnostics/geminiRepairPacket";

const DMZ_OPERATOR_COOKIE = "ironframe-operator-id";
const DMZ_DEFAULT_OPERATOR = "ironframe-dmz-console";

function ensureDispositionOperatorCookie(): void {
  if (typeof document === "undefined") return;
  if (document.cookie.split(";").some((c) => c.trim().startsWith(`${DMZ_OPERATOR_COOKIE}=`))) return;
  document.cookie = `${DMZ_OPERATOR_COOKIE}=${encodeURIComponent(DMZ_DEFAULT_OPERATOR)}; Path=/; Max-Age=604800; SameSite=Lax`;
}

export type DiagnosticReportModalProps = {
  open: boolean;
  onClose: () => void;
  /** `replay` = read-only portal for archived COPY FOR GEMINI packets. */
  variant?: "submit" | "replay";
  /** Frozen packet from `OPERATIONAL_DEFICIENCY_REPORT` (replay only). */
  archivedGeminiRepairPacket?: string;
  /** Deficiency comment at submission time (replay only). */
  archivedComment?: string;
  threatId: string;
  threatTitle: string;
  threatStatus: string;
  likelihood: number;
  impact: number;
  ingestionDetails: string | null | undefined;
  sourceComponentPath: string;
  onSubmitted?: () => void;
};

export function DiagnosticReportModal({
  open,
  onClose,
  variant = "submit",
  archivedGeminiRepairPacket,
  archivedComment,
  threatId,
  threatTitle,
  threatStatus,
  likelihood,
  impact,
  ingestionDetails,
  sourceComponentPath,
  onSubmitted,
}: DiagnosticReportModalProps) {
  const [comment, setComment] = useState("");
  const [gitRevision, setGitRevision] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isReplay = variant === "replay" && Boolean(archivedGeminiRepairPacket?.trim());

  useEffect(() => {
    if (!open || isReplay) return;
    setError(null);
    void (async () => {
      const r = await getDiagnosticsGitRevisionAction();
      setGitRevision(r.revision);
    })();
  }, [open, isReplay]);

  useLayoutEffect(() => {
    if (open) ensureDispositionOperatorCookie();
  }, [open]);

  const geminiPacket = useMemo(() => {
    if (isReplay) return (archivedGeminiRepairPacket ?? "").trim();
    return buildGeminiRepairPacket({
      comment,
      threatId,
      threatTitle,
      threatStatus,
      likelihood,
      impact,
      sourceComponentPath,
      gitRevision,
      ingestionDetails,
    });
  }, [
    isReplay,
    archivedGeminiRepairPacket,
    comment,
    threatId,
    threatTitle,
    threatStatus,
    likelihood,
    impact,
    sourceComponentPath,
    gitRevision,
    ingestionDetails,
  ]);

  const copyPacket = async () => {
    try {
      await navigator.clipboard.writeText(geminiPacket);
    } catch {
      setError("Could not copy to clipboard.");
    }
  };

  const submit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const res = await submitOperationalDeficiencyReportAction({
          threatId,
          comment,
          likelihood,
          impact,
          sourceComponentPath,
          geminiRepairPacket: geminiPacket,
        });
        if (!res.success) {
          setError(res.error);
          return;
        }
        setComment("");
        onClose();
        onSubmitted?.();
      })();
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diag-modal-title"
    >
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col rounded-lg border border-zinc-700 bg-[#09090b] shadow-2xl">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2 id="diag-modal-title" className="font-mono text-sm font-black uppercase tracking-wide text-zinc-200">
            {isReplay ? "Gemini packet portal · archived deficiency" : "Diagnostic report"}
          </h2>
          <p className="mt-1 font-mono text-[10px] leading-relaxed text-zinc-500">
            {isReplay ? (
              <>
                Read-only snapshot. Copy the <span className="text-zinc-400">COPY FOR GEMINI</span> block for regressions
                or Irontech repair runs.
              </>
            ) : (
              <>
                Shadow-mode repair bridge. Describe the defect, copy the Gemini packet into chat, then submit to log{" "}
                <span className="text-zinc-400">OPERATIONAL_DEFICIENCY_REPORT</span>.
              </>
            )}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-zinc-400">Deficiency comment</p>
            {isReplay ? (
              <pre className="mt-1.5 max-h-[28vh] overflow-auto whitespace-pre-wrap rounded border border-zinc-800 bg-black px-3 py-2 font-sans text-sm leading-relaxed text-zinc-300">
                {(archivedComment ?? "").trim() || "—"}
              </pre>
            ) : (
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={10}
                placeholder="UI friction, logic break, repro steps…"
                className="mt-1.5 w-full resize-y rounded border border-zinc-700 bg-black px-3 py-2 font-sans text-sm leading-relaxed text-zinc-100 outline-none focus:border-zinc-500"
              />
            )}
          </div>

          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-zinc-400">Copy for Gemini</p>
            <code className="mt-1.5 block max-h-[38vh] overflow-auto rounded border border-zinc-800 bg-black p-3 font-mono text-[10px] leading-relaxed text-zinc-300 whitespace-pre">
              {geminiPacket}
            </code>
            <button
              type="button"
              onClick={() => void copyPacket()}
              className="mt-2 rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-zinc-200 hover:border-zinc-400 hover:bg-zinc-800"
            >
              Copy packet
            </button>
          </div>

          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-800 px-4 py-3">
          <button
            type="button"
            className="rounded border border-zinc-700 px-3 py-1.5 font-mono text-[10px] font-bold uppercase text-zinc-400 hover:bg-zinc-900"
            onClick={() => {
              onClose();
              setError(null);
            }}
          >
            {isReplay ? "Close" : "Cancel"}
          </button>
          {isReplay ? null : (
            <button
              type="button"
              disabled={pending || comment.trim().length < 4}
              onClick={submit}
              className="rounded border border-zinc-500 bg-zinc-200 px-3 py-1.5 font-mono text-[10px] font-black uppercase text-black hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "Saving…" : "Submit to audit log"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
