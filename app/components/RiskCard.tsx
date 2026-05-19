"use client";

import { CheckCircle2 } from "lucide-react";
import type { RiskCardProcessedData, SystemIntegrityDrillKind } from "@/app/types/riskCard";
import { isRiskLifecycleCardStatus } from "@/app/types/riskCard";
import { InlineAuditAccordion } from "@/app/components/InlineAuditAccordion";
import { VerifyArtifactButton } from "@/app/components/VerifyArtifactButton";

export type { RiskCardProcessedData, RiskCardDisplayStatus } from "@/app/types/riskCard";

export type RiskCardProps = {
  processedData: RiskCardProcessedData;
  /** 0 = newest on top of vertical stack */
  stackIndex?: number;
  compact?: boolean;
  /** Opens lane-level ForensicAuditModal (parent must mount portal). */
  onVerifyArtifact?: () => void;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function borderClassesForStatus(status: RiskCardProcessedData["status"]): string {
  if (isRiskLifecycleCardStatus(status)) {
    switch (status) {
      case "INGESTED":
        return "border-zinc-600/60 bg-zinc-950/50 shadow-[inset_0_0_12px_rgba(148,163,184,0.08)]";
      case "REGISTERED":
        return "border-slate-300 bg-slate-950";
      case "ACTIVE":
        return "border-red-500 bg-[#0a0406]/95 shadow-[0_0_24px_rgba(239,68,68,0.45)] ring-2 ring-amber-500/40";
      case "RESOLVED":
        return "border-emerald-700/40 bg-slate-950/35";
    }
  }
  switch (status) {
    case "PENDING_INTEGRITY":
      return "border-violet-500/80";
    case "ASSIGNED":
      return "border-cyan-400";
    case "PROCESSING":
      return "border-amber-500";
    case "VERIFIED":
      return "border-emerald-500";
  }
}

function statusPulse(status: RiskCardProcessedData["status"]): boolean {
  return status === "ACTIVE" || status === "PROCESSING" || status === "PENDING_INTEGRITY";
}

function lifecycleHint(status: RiskCardProcessedData["status"]): string | null {
  if (!isRiskLifecycleCardStatus(status)) return null;
  switch (status) {
    case "INGESTED":
      return "Sensing…";
    case "REGISTERED":
      return "Baseline Logged";
    case "ACTIVE":
      return null;
    case "RESOLVED":
      return "Forensic Closure";
  }
}

function systemIntegrityBadgeClass(bot: SystemIntegrityDrillKind): string {
  switch (bot) {
    case "ATTBOT":
      return "border-amber-400/90 bg-amber-950 text-amber-100";
    case "KIMBOT":
      return "border-rose-500/90 bg-rose-950 text-rose-100";
    case "GRCBOT":
      return "border-cyan-400/90 bg-cyan-950 text-cyan-100";
  }
}

/**
 * Presentation-only risk deck card. Forensic modal lives on the parent lane (`RiskDeck`).
 */
export default function RiskCard({
  processedData,
  stackIndex = 0,
  compact = false,
  onVerifyArtifact,
}: RiskCardProps) {
  const {
    title,
    value,
    delta,
    status,
    frameworkLabel,
    governedLiability,
    systemIntegrityDrill,
    markdownAuditBlock,
  } = processedData;
  const depth = Math.min(stackIndex, 6);
  const hint = lifecycleHint(status);
  const displayDelta = hint ?? delta;
  const isIngested = status === "INGESTED";
  const isRegistered = status === "REGISTERED";
  const isResolved = status === "RESOLVED";
  const stackZ = 30 - stackIndex;
  const showFinancialStats =
    Boolean(frameworkLabel?.trim()) || Boolean(governedLiability?.trim());
  const integrityDrill = systemIntegrityDrill ?? null;
  const auditMarkdown = markdownAuditBlock?.trim() ?? "";
  const hasForensicAudit = auditMarkdown.length > 0;

  return (
    <article
      className={cn(
        "relative border-2 backdrop-blur-sm transition-[transform,box-shadow] duration-300 ease-out",
        compact ? "rounded-lg px-2.5 py-2" : "rounded-xl px-4 py-3",
        borderClassesForStatus(status),
        statusPulse(status) && "animate-pulse",
        isIngested && "opacity-50 animate-[shimmer_2.5s_ease-in-out_infinite]",
        isRegistered && "opacity-100",
        isResolved &&
          "forensic-ghost opacity-70 transition-opacity duration-[4000ms] ease-linear",
      )}
      style={{
        boxShadow: [
          `0 ${4 + depth}px 0 0 rgba(2, 6, 23, 0.85)`,
          `0 ${8 + depth * 2}px ${16 + depth * 2}px -6px rgba(0, 0, 0, 0.55)`,
          `0 0 0 1px rgba(148, 163, 184, 0.06)`,
        ].join(", "),
        zIndex: stackZ,
        transform: stackIndex > 0 ? `translateY(${stackIndex * 2}px)` : undefined,
      }}
      data-testid="risk-card"
      data-risk-status={status}
      data-system-integrity-drill={integrityDrill ?? undefined}
    >
      {integrityDrill ? (
        <span
          className={cn(
            "mb-2 inline-flex max-w-full items-center rounded border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] shadow-sm",
            systemIntegrityBadgeClass(integrityDrill),
          )}
          data-testid="risk-card-integrity-badge"
        >
          System integrity · {integrityDrill}
        </span>
      ) : null}
      {isResolved ? (
        <CheckCircle2
          className="absolute right-2 top-2 h-4 w-4 text-emerald-400"
          aria-hidden
        />
      ) : null}
      <h3
        className={cn(
          "relative line-clamp-2 font-bold leading-snug",
          status === "ACTIVE" ? "text-red-50" : isIngested ? "text-zinc-400" : "text-white",
          compact ? "text-[10px]" : "text-sm",
          isResolved && "pr-5 text-slate-400",
          integrityDrill && !compact && "pr-1",
        )}
      >
        {title}
      </h3>
      <div className={cn(
          "relative flex flex-wrap items-baseline justify-between gap-x-1 gap-y-0.5",
          compact ? "mt-1" : "mt-2",
        )}
      >
        <span
          className={cn(
            "font-mono tabular-nums",
            status === "ACTIVE" ? "text-amber-100" : isIngested ? "text-zinc-500" : "text-white",
            compact ? "text-xs" : "text-lg",
          )}
        >
          {value}
        </span>
        <span
          className={cn(
            "font-semibold uppercase tracking-wide",
            isIngested && "text-zinc-500",
            isRegistered && "text-slate-200",
            status === "ACTIVE" && "text-red-300/90",
            isResolved && "text-emerald-400/75",
            !isRiskLifecycleCardStatus(status) && "text-slate-400",
            compact ? "text-[8px]" : "text-[10px]",
          )}
        >
          {displayDelta}
        </span>
      </div>
      {showFinancialStats ? (
        <dl
          className={cn(
            "relative mt-2 grid grid-cols-1 gap-1.5 border-t border-slate-700/50 pt-2",
            !compact && "sm:grid-cols-2",
          )}
          data-testid="risk-card-financial-stats"
        >
          <div className="min-w-0">
            <dt className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Framework
            </dt>
            <dd
              className={cn(
                "mt-0.5 font-mono font-semibold tabular-nums text-cyan-200/95",
                compact ? "text-[10px]" : "text-xs",
              )}
            >
              {frameworkLabel?.trim() || "—"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Governed liability
            </dt>
            <dd
              className={cn(
                "mt-0.5 font-mono font-semibold tabular-nums text-amber-100/95",
                compact ? "text-[10px]" : "text-xs",
              )}
            >
              {governedLiability?.trim() || "—"}
            </dd>
          </div>
        </dl>
      ) : null}

      {hasForensicAudit ? (
        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <InlineAuditAccordion markdownAuditBlock={auditMarkdown} />
        </div>
      ) : null}

      {hasForensicAudit && onVerifyArtifact ? (
        <footer
          className={cn(
            "relative mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-800/60 pt-2",
            compact ? "mt-1.5 pt-1.5" : undefined,
          )}
          data-testid="risk-card-footer"
        >
          <VerifyArtifactButton onClick={onVerifyArtifact} />
        </footer>
      ) : null}
    </article>
  );
}
