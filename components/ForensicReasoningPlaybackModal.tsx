"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { getForensicReasoningPlayback, type FlemmingForensicReasoningLogV1 } from "@/app/actions/sentinelActions";
import { generateForensicReceipt } from "@/app/actions/forensicReceiptActions";
import { formatCentsToAccountingUSD } from "@/app/utils/formatCentsToUSD";

type Props = {
  threatId: string | null;
  onClose: () => void;
};

export default function ForensicReasoningPlaybackModal({ threatId, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<FlemmingForensicReasoningLogV1 | null>(null);
  const [forensicSeal, setForensicSeal] = useState<Record<string, unknown> | null>(null);
  const [governanceHash, setGovernanceHash] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    if (!threatId) {
      setLog(null);
      setForensicSeal(null);
      setGovernanceHash(null);
      setError(null);
      return;
    }
    setError(null);
    setLog(null);
    setForensicSeal(null);
    setGovernanceHash(null);
    startTransition(() => {
      void (async () => {
        const r = await getForensicReasoningPlayback(threatId);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setLog(r.log);
        setForensicSeal(r.forensicSeal);
        setGovernanceHash(r.governanceHash);
        if (!r.log && !r.forensicSeal) {
          setError("No forensic_reasoning_log or forensic_seal on this risk event.");
        } else {
          setError(null);
        }
      })();
    });
  }, [threatId]);

  if (!threatId) return null;

  const sealJson =
    forensicSeal != null ? JSON.stringify(forensicSeal, null, 2) : null;

  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forensic-playback-title"
    >
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-violet-800/50 bg-[#0c0a12] p-4 shadow-2xl shadow-violet-950/40">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <h2
          id="forensic-playback-title"
          className="pr-8 text-xs font-black uppercase tracking-widest text-violet-300"
        >
          Reasoning playback (Postgres JSONB)
        </h2>
        <p className="mt-1 font-mono text-[10px] text-zinc-500">{threatId}</p>
        {governanceHash ? (
          <p className="mt-1 break-all font-mono text-[9px] text-zinc-500">
            governance_hash: <span className="text-emerald-400/80">{governanceHash}</span>
          </p>
        ) : null}

        {isPending ? (
          <p className="mt-4 text-[11px] text-zinc-400">Loading governance bundle…</p>
        ) : null}
        {error ? <p className="mt-4 text-[11px] text-red-400">{error}</p> : null}

        {sealJson && !isPending ? (
          <section className="mt-4 text-left">
            <h3 className="text-[10px] font-bold uppercase tracking-wide text-cyan-200/90">
              forensic_seal (column JSONB)
            </h3>
            <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded border border-zinc-800 bg-zinc-950/80 p-2 font-mono text-[10px] text-cyan-100/90">
              {sealJson}
            </pre>
          </section>
        ) : null}

        {log && !isPending ? (
          <div className="mt-4 space-y-4 text-left text-[11px] leading-relaxed text-zinc-300">
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-amber-200/90">
                Postgres — playback query (Flemming)
              </h3>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded border border-zinc-800 bg-zinc-950/80 p-2 font-mono text-[10px] text-emerald-200/90">
                {log.postgres18ExactQuery}
              </pre>
            </section>
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-amber-200/90">
                Agent 5 (Ironscribe) citation
              </h3>
              <p className="mt-1 font-mono text-[10px] text-zinc-400">
                SHA-256:{" "}
                <span className="break-all text-emerald-300/90">
                  {log.agent5IronscribeCitation.sourceDocumentHashSha256}
                </span>
              </p>
              <p className="mt-1 text-zinc-400">
                Page reference:{" "}
                <span className="font-semibold text-zinc-200">{log.agent5IronscribeCitation.pageReference}</span>
              </p>
            </section>
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-amber-200/90">
                Agent 3 (Irontrust) — BigInt ledger math
              </h3>
              <p className="mt-1 text-zinc-400">{log.agent3IrontrustDeterministic.formulaExplanation}</p>
              <p className="mt-2 font-mono text-[10px] text-zinc-500">
                base_impact_cents:{" "}
                <span className="text-zinc-300">
                  {log.agent3IrontrustDeterministic.baseImpactCentsDecimal ??
                    log.agent3IrontrustDeterministic.aleBaselineCentsDecimal ??
                    "—"}
                </span>
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
                governance_impact_multiplier (bps):{" "}
                <span className="text-zinc-300">
                  {log.agent3IrontrustDeterministic.governanceImpactMultiplierBpsDecimal ?? "—"}
                </span>
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
                governed_impact_cents (base × multiplier / 100):{" "}
                <span className="text-zinc-300">
                  {log.agent3IrontrustDeterministic.governedImpactCentsDecimal ??
                    log.agent3IrontrustDeterministic.financialRiskCentsDecimal ??
                    "—"}
                </span>
                {log.agent3IrontrustDeterministic.governedImpactCentsDecimal ||
                log.agent3IrontrustDeterministic.financialRiskCentsDecimal ? (
                  <span className="ml-2 font-sans text-emerald-200/90">
                    (
                    {formatCentsToAccountingUSD(
                      log.agent3IrontrustDeterministic.governedImpactCentsDecimal ??
                        log.agent3IrontrustDeterministic.financialRiskCentsDecimal ??
                        "0",
                    )}
                    )
                  </span>
                ) : null}
              </p>
            </section>
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-amber-200/90">
                Agent 13 (Ironwatch) hybrid retrieval
              </h3>
              <p className="mt-1 font-mono text-[10px] text-zinc-500">
                semanticDistance (1 − cosine): {log.ironwatchAgent13.semanticDistance.toFixed(4)} · fused score:{" "}
                {log.ironwatchAgent13.vectorRecallScore.toFixed(4)}
              </p>
              {log.ironwatchAgent13.lowConfidenceSemanticDrift ? (
                <p className="mt-2 text-[10px] text-amber-300">Low-confidence semantic drift was flagged at seal.</p>
              ) : null}
            </section>
          </div>
        ) : null}

        {pdfError ? <p className="mt-3 text-[10px] text-red-400">{pdfError}</p> : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={pdfBusy || !threatId}
            onClick={() => {
              if (!threatId) return;
              setPdfError(null);
              setPdfBusy(true);
              void (async () => {
                try {
                  const r = await generateForensicReceipt(threatId);
                  if (!r.ok) {
                    setPdfError(r.error);
                    return;
                  }
                  const bytes = Uint8Array.from(atob(r.base64Pdf), (c) => c.charCodeAt(0));
                  const blob = new Blob([bytes], { type: "application/pdf" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = r.filename;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  setPdfError(e instanceof Error ? e.message : String(e));
                } finally {
                  setPdfBusy(false);
                }
              })();
            }}
            className="rounded border border-emerald-700/55 bg-emerald-950/40 px-3 py-2 text-[10px] font-bold uppercase text-emerald-200/95 hover:bg-emerald-900/45 disabled:opacity-40"
          >
            {pdfBusy ? "PDF…" : "Print forensic receipt (PDF)"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-600 px-3 py-2 text-[10px] font-bold uppercase text-zinc-400 hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
