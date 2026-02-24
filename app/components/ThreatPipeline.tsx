"use client";

import { Bot } from "lucide-react";
import { useRouter } from "next/navigation";

type SupplyChainThreat = {
  vendorName: string;
  impact: string;
  severity: "CRITICAL";
  source: "Nth-Party Map";
  liabilityUsd: number;
};

type ThreatPipelineProps = {
  supplyChainThreat: SupplyChainThreat | null;
  showSocStream: boolean;
  onRemediateSupplyChainThreat?: (vendorName: string) => void;
};

export default function ThreatPipeline({ supplyChainThreat, showSocStream, onRemediateSupplyChainThreat }: ThreatPipelineProps) {
  const router = useRouter();

  return (
    <section className="border-b border-slate-800 bg-slate-900/50 px-4 py-6">
      <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
        <h2 className="text-[11px] font-bold tracking-wide text-white">MEDSHIELD THREAT PIPELINE</h2>
      </div>

      <div className="space-y-3">
        {showSocStream && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">SOC STREAM</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded bg-emerald-500 px-3 py-1 text-[10px] font-bold text-white hover:bg-emerald-400"
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="rounded border border-red-500 bg-slate-900 px-3 py-1 text-[10px] font-bold text-red-500 hover:bg-slate-800"
                >
                  Reject
                </button>
              </div>
            </div>
            <div className="rounded border border-slate-800 bg-slate-950/40 p-2 text-[10px] text-slate-500">
              SOC stream empty.
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">AGENT STREAM</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded bg-emerald-500 px-3 py-1 text-[10px] font-bold text-white hover:bg-emerald-400"
              >
                Accept
              </button>
              <button
                type="button"
                className="rounded border border-red-500 bg-slate-900 px-3 py-1 text-[10px] font-bold text-red-500 hover:bg-slate-800"
              >
                Reject
              </button>
            </div>
          </div>
          <div className="rounded border border-slate-800 bg-slate-950/40 p-2 text-[10px] text-slate-500">
            Agent stream empty.
          </div>
        </div>

        {supplyChainThreat && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">SUPPLY CHAIN ALERT</p>
              <button
                type="button"
                onClick={() => {
                  onRemediateSupplyChainThreat?.(supplyChainThreat.vendorName);
                  router.push("/medshield/playbooks");
                }}
                className="rounded border border-blue-500/70 bg-blue-500/15 px-3 py-1 text-[10px] font-bold uppercase text-blue-200"
              >
                REMEDIATE
              </button>
            </div>

            <div className="rounded border border-slate-800 border-l-2 border-l-red-500 bg-slate-950/70 p-2">
              <div className="flex items-start gap-2">
                <Bot className="mt-0.5 h-4 w-4 text-slate-300" />
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-white">Nth-Party Breach Detected: {supplyChainThreat.vendorName}</span>
                    <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">SUPPLY CHAIN</span>
                    <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">CRITICAL ENTITY</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{supplyChainThreat.impact}</p>
                  <p className="mt-1 text-[10px] text-slate-400">Source: {supplyChainThreat.source} | Liability: ${supplyChainThreat.liabilityUsd.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}