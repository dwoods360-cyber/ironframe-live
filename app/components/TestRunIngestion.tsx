"use client";

import { useRiskStore } from "@/app/store/riskStore";
import { appendAuditLog } from "@/app/utils/auditLogger";

/**
 * Test Run Ingestion: always visible for developers/QA. No conditional hide.
 * Provides a one-click test signal to validate the ingestion pipeline.
 */
export default function TestRunIngestion() {
  const upsertPipelineThreat = useRiskStore((s) => s.upsertPipelineThreat);
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);

  const handleRunTest = () => {
    const id = `test-run-${Date.now()}`;
    upsertPipelineThreat({
      id,
      name: "Test Run Ingestion — QA validation signal",
      loss: 2.5,
      score: 2.5,
      industry: selectedIndustry,
      source: "Test Run Ingestion",
      description: `Test signal injected for QA/developer validation. Industry: ${selectedIndustry}.`,
    });
    appendAuditLog({
      action_type: "GRC_PROCESS_THREAT",
      log_type: "GRC",
      description: "Test Run Ingestion: test signal injected for pipeline validation.",
      metadata_tag: `sector:${selectedIndustry}|test-run:true`,
    });
  };

  return (
    <div
      className="border-b border-slate-800 bg-slate-900/40 px-4 py-3"
      data-testid="test-run-ingestion"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-white">
            Test Run Ingestion
          </h2>
          <span className="rounded border border-slate-700 bg-slate-800/80 px-1.5 py-0.5 text-[9px] text-slate-400">
            Always visible for QA
          </span>
        </div>
        <button
          type="button"
          onClick={handleRunTest}
          className="rounded border border-emerald-500/70 bg-emerald-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/25"
        >
          Inject test signal
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-slate-500">
        Injects a test threat into the pipeline for validation. Check RISK REGISTRATION below for the card.
      </p>
    </div>
  );
}
