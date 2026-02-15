"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import HealthScoreBadge from "@/app/components/HealthScoreBadge";
import RemediationSidebar from "@/app/components/RemediationSidebar";
import { useRemediationStore } from "@/app/store/remediationStore";
import { THREAT_PIPELINE_DATA } from "@/app/components/threatPipelineData";
import { calculateEntityScore, ENTITY_SCORING_DATA } from "@/app/utils/scoring";

const GRIDCORE_PLAYBOOK_STEPS = ["Grid Instability Protocol", "Substation Isolation Procedure", "SCADA Recovery Sequence"];

function StatusBadge({ status }: { status: "SECURE" | "VULNERABLE" | "CRITICAL" | "WARNING" }) {
  const styleByStatus = {
    SECURE: {
      text: "text-emerald-500",
      dot: "bg-emerald-500 animate-pulse",
    },
    VULNERABLE: {
      text: "text-red-500",
      dot: "bg-red-500",
    },
    CRITICAL: {
      text: "text-red-500",
      dot: "bg-red-500",
    },
    WARNING: {
      text: "text-amber-500",
      dot: "bg-amber-500",
    },
  } as const;

  return (
    <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase ${styleByStatus[status].text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${styleByStatus[status].dot}`} />
      {status}
    </span>
  );
}

export default function GridcorePage() {
  const router = useRouter();
  const [isRemediationOpen, setIsRemediationOpen] = useState(false);
  const [isFeedOnline, setIsFeedOnline] = useState(true);
  const [isPlaybookActive, setIsPlaybookActive] = useState(false);
  const [outageStartedAt, setOutageStartedAt] = useState<number | null>(null);
  const [timeToRemediationSeconds, setTimeToRemediationSeconds] = useState<number | null>(null);
  const remediationState = useRemediationStore();
  const gridcoreThreat = THREAT_PIPELINE_DATA.vulnerabilityDetectedScada;
  const threatSeverity = gridcoreThreat.severity;
  const entityData = {
    ...ENTITY_SCORING_DATA.gridcore,
    assets: ENTITY_SCORING_DATA.gridcore.assets.map((asset) =>
      remediationState.remediatedAssetIds.includes(asset.id)
        ? {
            ...asset,
            status: "SECURE" as const,
          }
        : asset,
    ),
  };
  const assets = entityData.assets;
  const currentScore = calculateEntityScore(entityData).score;
  const resilienceScore =
    timeToRemediationSeconds === null
      ? isFeedOnline
        ? 100
        : 40
      : timeToRemediationSeconds <= 60
        ? 98
        : timeToRemediationSeconds <= 180
          ? 90
          : timeToRemediationSeconds <= 300
            ? 82
            : 70;
  const ttrLabel =
    timeToRemediationSeconds === null
      ? isFeedOnline
        ? "Awaiting simulation"
        : "Outage active"
      : `${(timeToRemediationSeconds / 60).toFixed(1)} min`;

  const handleSimulateOutage = () => {
    setIsFeedOnline(false);
    setIsPlaybookActive(true);
    setOutageStartedAt(Date.now());
    setTimeToRemediationSeconds(null);
    setIsRemediationOpen(true);
  };

  const handleMarkRemediated = () => {
    if (!outageStartedAt) {
      return;
    }

    const elapsedSeconds = Math.max(1, Math.round((Date.now() - outageStartedAt) / 1000));
    setTimeToRemediationSeconds(elapsedSeconds);
    setIsFeedOnline(true);
    setIsPlaybookActive(false);
    setOutageStartedAt(null);
    setIsRemediationOpen(false);
  };

  return (
    <div className="min-h-full bg-slate-950 p-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="group mb-6 flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-[10px] font-bold uppercase text-white transition-colors hover:border-blue-500 hover:text-blue-400"
      >
        <ArrowLeft className="h-3 w-3 text-slate-400 transition-colors group-hover:text-blue-400" />
        Back
      </button>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded border border-slate-800 bg-slate-900/40 p-4 md:col-span-1">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-white">Executive Summary</h2>
          <p className="text-[11px] leading-relaxed text-slate-300">Resilience against SCADA-level intrusions.</p>
          <div className="mt-3 rounded border border-slate-800 bg-slate-950/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Health Score</p>
              <button
                type="button"
                onClick={() => currentScore < 90 && setIsRemediationOpen(true)}
                className="rounded border border-blue-500/60 bg-blue-500/10 px-2 py-1 text-[9px] font-bold uppercase text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={currentScore >= 90}
              >
                REMEDIATION PLAN
              </button>
            </div>
            <HealthScoreBadge entityData={entityData} scoreClassName="text-3xl" tooltipAlign="left" />
          </div>

          <div className="mt-3 rounded border border-slate-800 bg-slate-950/40 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Operational Resilience Stress Test</p>
            <div className="mb-2 flex items-center justify-between text-[10px]">
              <span className="font-bold uppercase text-slate-400">Live Data Feed</span>
              <span className={`font-bold uppercase ${isFeedOnline ? "text-emerald-400" : "text-red-400"}`}>
                {isFeedOnline ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
            <div className="mb-3 flex items-center justify-between text-[10px]">
              <span className="font-bold uppercase text-slate-400">Resilience Score</span>
              <span className={`text-lg font-bold ${resilienceScore >= 90 ? "text-emerald-400" : resilienceScore >= 80 ? "text-amber-400" : "text-red-400"}`}>
                {resilienceScore}
              </span>
            </div>
            <div className="mb-3 rounded border border-slate-800 bg-slate-900/50 px-2 py-1.5 text-[10px] text-slate-300">
              Time to Remediation (TTR): <span className="font-bold text-white">{ttrLabel}</span>
            </div>
            {isFeedOnline ? (
              <button
                type="button"
                onClick={handleSimulateOutage}
                className="w-full rounded border border-red-500 bg-red-500/10 px-2 py-1.5 text-[10px] font-bold uppercase text-red-300 hover:bg-red-500/20"
              >
                SIMULATE OUTAGE
              </button>
            ) : (
              <button
                type="button"
                onClick={handleMarkRemediated}
                className="w-full rounded border border-emerald-500 bg-emerald-500/10 px-2 py-1.5 text-[10px] font-bold uppercase text-emerald-300 hover:bg-emerald-500/20"
              >
                MARK INCIDENT REMEDIATED
              </button>
            )}

            {isPlaybookActive && (
              <div className="mt-3 rounded border border-red-500/50 bg-red-500/10 p-2">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-red-300">Incident Response Playbook Triggered</p>
                <ul className="space-y-1">
                  {GRIDCORE_PLAYBOOK_STEPS.map((step, index) => (
                    <li key={step} className="text-[10px] text-slate-200">
                      {index + 1}. {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-slate-800 pt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Quick Access Reports</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/reports/nerc-cip-assets"
                className="flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-[9px] text-blue-400 transition-all hover:bg-blue-500/10"
              >
                NERC CIP
                <ExternalLink className="h-3 w-3" />
              </Link>
              <Link
                href="/reports/scada-traffic"
                className="flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-[9px] text-blue-400 transition-all hover:bg-blue-500/10"
              >
                SCADA Traffic
                <ExternalLink className="h-3 w-3" />
              </Link>
              <Link
                href="/reports/gridex-vii"
                className="flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-[9px] text-blue-400 transition-all hover:bg-blue-500/10"
              >
                GridEx VII
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-800 pt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">System Diagnostics</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/gridcore/logs"
                className="flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-[9px] text-blue-400 transition-all hover:bg-blue-500/10"
              >
                VIEW AUDIT LOGS
                <ExternalLink className="h-3 w-3" />
              </Link>
              <Link
                href="/gridcore/topology"
                className="flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-[9px] text-blue-400 transition-all hover:bg-blue-500/10"
              >
                VIEW NETWORK TOPOLOGY
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </article>

        <article className="rounded border border-slate-800 bg-slate-900/40 p-4 md:col-span-2">
          {!isFeedOnline && (
            <div className="mb-3 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-red-300">
              LIVE DATA FEED OFFLINE // FAILOVER MODE ACTIVE
            </div>
          )}
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-white">Asset Risk Inventory</h2>
          <div className="space-y-2">
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/40 px-3 py-2">
                <span className="text-[11px] font-bold text-white">{asset.name}</span>
                <StatusBadge status={asset.status} />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Entity-Specific Threats</h3>
            <div className="mb-2 border-l-2 border-red-500 bg-slate-900/40 p-3">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[11px] font-bold text-white">{gridcoreThreat.title}</span>
                <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">{threatSeverity}</span>
              </div>
              <p className="text-[10px] text-slate-400">{gridcoreThreat.description}</p>
              <div className="mt-3 flex items-center gap-2">
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
          </div>
        </article>
      </section>

      <RemediationSidebar isOpen={isRemediationOpen} onClose={() => setIsRemediationOpen(false)} entityLabel="GRIDCORE" entityKey="gridcore" />
    </div>
  );
}
