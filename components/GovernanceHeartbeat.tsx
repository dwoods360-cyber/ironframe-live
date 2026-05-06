"use client";

import { useEffect, useState } from "react";
import { verifyGovernanceIntegrity, type GovernanceIntegrityOutcome } from "@/app/actions/sentinelActions";

type Props = {
  threatId: string;
  className?: string;
};

/**
 * Pulsing indicator: recomputes SHA-256(riskId | signature | timestamp) vs `governance_hash`.
 * Neutral when no seal; red on mismatch (tamper).
 */
export default function GovernanceHeartbeat({ threatId, className = "" }: Props) {
  const [outcome, setOutcome] = useState<GovernanceIntegrityOutcome | "pending">("pending");

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      void verifyGovernanceIntegrity(threatId).then((r) => {
        if (cancelled) return;
        if (!r.ok) {
          setOutcome("no_seal");
          return;
        }
        setOutcome(r.outcome);
      });
    };
    run();
    const t = window.setInterval(run, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [threatId]);

  const title =
    outcome === "pending"
      ? "Governance heartbeat: verifying sealed hash…"
      : outcome === "match"
        ? "Governance heartbeat: sealed hash matches recomputed digest."
        : outcome === "mismatch"
          ? "Tamper detected: sealed hash does not match Risk ID, signature, and timestamp."
          : "No governance seal on this risk event (heartbeat not applicable).";

  const dotClass =
    outcome === "pending"
      ? "animate-pulse bg-zinc-500"
      : outcome === "match"
        ? "animate-pulse bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
        : outcome === "mismatch"
          ? "animate-pulse bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.55)]"
          : "bg-zinc-600";

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={title}
      role="status"
      aria-label={title}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
      <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Gov</span>
    </span>
  );
}
