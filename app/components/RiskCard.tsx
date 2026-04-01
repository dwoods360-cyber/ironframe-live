"use client";

/**
 * RiskCard — border-only telemetry. No inline SVG, <img>, or icon components (no dotted / snowflake / header mark).
 * Outer border state: idle (cyan-400) → processing (amber-500 + pulse) → verified (emerald-500).
 */

import React from "react";
import { formatUsdCentsBigInt, toBigIntCents } from "@/app/utils/formatUsdCentsBigInt";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type RiskCardStatus = "ASSIGNED" | "PROCESSING" | "VERIFIED";

export interface RiskCardProps {
  status: RiskCardStatus;
  risk: {
    title: string;
    /** Integer cents (BigInt). Display uses string formatting only — no float math. */
    ale_impact: bigint | number | string;
  };
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

export function RiskCard({ status, risk }: RiskCardProps) {
  const aleBi = toBigIntCents(risk.ale_impact);

  return (
    <div
      className={cn(
        "rounded-xl border-2 bg-slate-950/40 p-6 transition-colors duration-300",
        borderClassesForStatus(status),
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

export default RiskCard;
