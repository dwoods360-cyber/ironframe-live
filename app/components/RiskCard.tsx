"use client";

/**
 * RiskCard — border-only telemetry. No inline SVG, <img>, or icon components (no dotted / snowflake / header mark).
 * Outer border state: idle (cyan-400) → processing (amber-500 + pulse) → verified (emerald-500).
 */

import React, { useMemo } from "react";
import { formatUsdCentsBigInt, toBigIntCents } from "@/app/utils/formatUsdCentsBigInt";
import { useAgentStore } from "@/app/store/agentStore";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type RiskCardStatus = "ASSIGNED" | "PROCESSING" | "VERIFIED";

export interface RiskCardProps {
  /** Stable ThreatEvent id for selector narrowing. */
  threatId?: string;
  status: RiskCardStatus;
  risk: {
    title: string;
    /** Integer cents (BigInt). Display uses string formatting only — no float math. */
    ale_impact: bigint | number | string;
  };
}

function areRiskCardPropsEqual(prev: RiskCardProps, next: RiskCardProps): boolean {
  return (
    prev.threatId === next.threatId &&
    prev.status === next.status &&
    prev.risk.title === next.risk.title &&
    String(prev.risk.ale_impact) === String(next.risk.ale_impact)
  );
}

function borderClassesForStatus(status: RiskCardStatus): string {
  switch (status) {
    case "ASSIGNED":
      return "border-cyan-400";
    case "PROCESSING":
      return "border-amber-500 animate-pulse";
    case "VERIFIED":
      return "border-emerald-500";
  }
}

function RiskCardBase({ threatId, status, risk }: RiskCardProps) {
  const aleBi = toBigIntCents(risk.ale_impact);
  const threatTelemetry = useAgentStore((state) =>
    threatId?.trim() ? state.threatTelemetry[threatId.trim()] : undefined,
  );
  // Animation priority: mitigation (blue) overrides heartbeat amber when both are present.
  const rawStatus: RiskCardStatus =
    threatTelemetry?.status === "PROCESSING" ||
    threatTelemetry?.status === "ASSIGNED" ||
    threatTelemetry?.status === "VERIFIED"
      ? threatTelemetry.status
      : status;
  const mitigationPriority = Boolean(threatTelemetry?.irontechMitigating);

  // Visual-state lock: require status stability for 500ms before changing border class.
  const [lockedStatus, setLockedStatus] = React.useState<RiskCardStatus>(rawStatus);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setLockedStatus(rawStatus), 500);
    return () => window.clearTimeout(timer);
  }, [rawStatus]);

  const borderClass = useMemo(() => {
    if (mitigationPriority) {
      return "border-blue-500 animate-pulse";
    }
    return borderClassesForStatus(lockedStatus);
  }, [lockedStatus, mitigationPriority]);

  return (
    <div
      className={cn(
        "rounded-xl border-2 bg-slate-950/40 p-6 transition-colors duration-300",
        borderClass,
      )}
      data-testid="risk-card"
      data-risk-status={status}
    >
      <h3 className="mb-3 text-xl font-bold text-white">{risk.title}</h3>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-sm uppercase tracking-wider text-slate-400">ALE Impact</span>
        <span className="font-mono text-2xl tabular-nums text-white">{formatUsdCentsBigInt(aleBi)}</span>
      </div>
    </div>
  );
}

export const RiskCard = React.memo(RiskCardBase, areRiskCardPropsEqual);
export default RiskCard;
