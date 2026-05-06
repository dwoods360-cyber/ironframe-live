"use client";

import { formatEstimatedFineLabel } from "@/app/utils/formatCentsToUSD";
import { DEFENSE_REGULATORY_SHIELD_BADGE_LABEL } from "@/lib/constants/grcGovernance";
import { useHasMounted } from "@/app/hooks/useHasMounted";
import { useRiskStore } from "@/app/store/riskStore";
import GovernanceHeartbeat from "@/components/GovernanceHeartbeat";
import ReasoningWaterfall from "@/components/ReasoningWaterfall";
import type { ReasoningWaterfallVM } from "@/app/utils/reasoningWaterfallFromIngestion";

/** ALE (cents) × framework multiplier → illustrative fine ceiling in cents (integer math). */
export function calculatePotentialFine(ale: bigint, framework: string): bigint {
  const f = framework.toUpperCase().trim();
  let mult100 = 120n;
  if (f.includes("ISO")) mult100 = 150n;
  else if (f.includes("NIST") || f.includes("GDPR")) mult100 = 400n;
  else if (f.includes("SOC")) mult100 = 120n;
  return (ale * mult100) / 100n;
}

/** Must match `JUSTIFY_ALLOWED` in `app/api/risk-events/[id]/budget-justification/route.ts`. */
const JUSTIFY_BUDGET_STATUSES = new Set(["MITIGATED", "RESOLVED", "CLOSED_ARCHIVED"]);

export type RiskEventCardProps = {
  id: string;
  title: string;
  complianceFramework: string;
  /** Integer cents as string (JSON-safe from dashboard). */
  financialRiskCents: string;
  /** ThreatState or workflow label — controls budget PDF eligibility. */
  status?: string | null;
  /** Industry Profile = Defense (hydration-safe when parent passes hasMounted && Defense). */
  showDefenseIndustryBadge?: boolean;
  /** Parsed GRC Gold forensic reasoning stages when `forensic_reasoning_log` exists on ingestion. */
  reasoningWaterfall?: ReasoningWaterfallVM | null;
  onOpen?: (id: string) => void;
};

/**
 * Shadow-plane risk row with ALE-derived regulatory fine overlay (framework multipliers).
 */
export default function RiskEventCard({
  id,
  title,
  complianceFramework,
  financialRiskCents,
  status,
  showDefenseIndustryBadge = false,
  reasoningWaterfall = null,
  onOpen,
}: RiskEventCardProps) {
  const hasMounted = useHasMounted();
  const setForensicPlaybackThreatId = useRiskStore((s) => s.setForensicPlaybackThreatId);
  let ale = 0n;
  try {
    ale = BigInt(financialRiskCents || "0");
  } catch {
    ale = 0n;
  }
  const fineCents = calculatePotentialFine(ale, complianceFramework);
  const fineLabel = formatEstimatedFineLabel(fineCents);
  const st = (status ?? "").trim().toUpperCase();
  const canJustifyBudget = JUSTIFY_BUDGET_STATUSES.has(st);
  const showDefenseBadge = hasMounted && showDefenseIndustryBadge;

  const openBudgetPdf = () => {
    window.open(`/api/risk-events/${encodeURIComponent(id)}/budget-justification`, "_blank", "noopener,noreferrer");
  };

  return (
    <article
      className="min-w-[220px] max-w-[280px] shrink-0 rounded-lg border border-slate-700/80 bg-slate-900/55 p-3 shadow-[inset_0_1px_0_0_rgba(148,163,184,0.06)]"
      aria-labelledby={`risk-event-${id}-title`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 id={`risk-event-${id}-title`} className="line-clamp-2 text-[11px] font-semibold leading-snug text-slate-100">
          {title}
        </h3>
        {onOpen ? (
          <button
            type="button"
            onClick={() => onOpen(id)}
            className="shrink-0 rounded border border-slate-600 bg-slate-800/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-300 hover:border-cyan-600 hover:text-cyan-100"
          >
            Open
          </button>
        ) : null}
      </div>
      <p className="mt-1 font-mono text-[9px] text-slate-500">{id.slice(0, 14)}…</p>
      <p className="mt-2 text-[9px] uppercase tracking-wide text-slate-500">Framework · {complianceFramework}</p>
      {showDefenseBadge ? (
        <p
          className="mt-1.5 inline-flex w-fit rounded border border-emerald-700/50 bg-emerald-950/40 px-2 py-0.5 text-[9px] font-bold tracking-wide text-emerald-100/95"
          title="Defense Industry Profile — CMMC L3 regulatory shield"
        >
          {DEFENSE_REGULATORY_SHIELD_BADGE_LABEL}
        </p>
      ) : null}
      <div className="mt-2 flex flex-col gap-2">
        <span
          className="inline-flex rounded-full border border-amber-900/35 bg-amber-950/25 px-2 py-1 text-[9px] font-medium leading-tight text-amber-100/90"
          title="Potential fine proxy: ALE × regulatory multiplier (illustrative)"
        >
          Regulatory Exposure · {fineLabel}
        </span>
        {canJustifyBudget ? (
          <button
            type="button"
            onClick={openBudgetPdf}
            className="rounded border border-emerald-800/50 bg-emerald-950/35 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-100 hover:border-emerald-500 hover:bg-emerald-900/40"
          >
            Justify Budget
          </button>
        ) : null}
        {reasoningWaterfall ? <ReasoningWaterfall data={reasoningWaterfall} /> : null}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <GovernanceHeartbeat threatId={id} className="text-slate-400" />
          <button
            type="button"
            onClick={() => setForensicPlaybackThreatId(id)}
            className="rounded border border-violet-700/55 bg-violet-950/40 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-violet-200/95 hover:bg-violet-900/45"
          >
            Why?
          </button>
        </div>
      </div>
    </article>
  );
}
