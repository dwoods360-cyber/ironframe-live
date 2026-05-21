import type { AttackRiskCardPhase, AttackRiskCardProcessedData } from "@/app/types/attackRiskCard";

export type AttackRiskCardProps = {
  processedData: AttackRiskCardProcessedData;
  phase?: AttackRiskCardPhase;
  isActive?: boolean;
  stackIndex?: number;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function phaseAccent(phase: AttackRiskCardPhase, isActive: boolean): string {
  if (phase === "FAILED") return "border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.35)]";
  if (phase === "PROCESSING" || isActive) {
    return "border-amber-500 shadow-[0_0_22px_rgba(245,158,11,0.4)] animate-pulse";
  }
  if (phase === "RESOLVED") return "border-rose-600/70";
  return "border-rose-500/85";
}

/**
 * Dumb Red Team attack holder — high-alert rose/amber on void background.
 */
export default function AttackRiskCard({
  processedData,
  phase = "ACTIVE",
  isActive = false,
  stackIndex = 0,
}: AttackRiskCardProps) {
  const { attackVector, targetAsset, agentId, payloadDetails } = processedData;
  const depth = Math.min(stackIndex, 8);

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-lg border-2 bg-[#0a0406]/95 px-3 py-2.5 backdrop-blur-sm",
        phaseAccent(phase, isActive),
      )}
      style={{
        boxShadow: [
          `0 ${3 + depth}px 0 0 rgba(69, 10, 10, 0.9)`,
          `0 ${6 + depth * 2}px ${14 + depth}px -4px rgba(0, 0, 0, 0.65)`,
          "inset 0 1px 0 0 rgba(251, 113, 133, 0.12)",
        ].join(", "),
      }}
      data-testid="attack-risk-card"
      data-attack-phase={phase}
      data-attack-active={isActive ? "true" : "false"}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-rose-950/50 via-transparent to-amber-950/25"
        aria-hidden
      />
      <div className="relative">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-300/90">
            Red Team
          </span>
          <span className="truncate font-mono text-[9px] text-amber-200/90">{agentId}</span>
        </div>
        <h3 className="line-clamp-2 text-xs font-bold leading-snug text-rose-50">{attackVector}</h3>
        <p className="mt-1 text-[10px] font-semibold text-amber-100/90">
          Target: <span className="text-rose-100">{targetAsset}</span>
        </p>
        <p className="mt-1.5 line-clamp-3 font-mono text-[9px] leading-relaxed text-rose-200/75">
          {payloadDetails}
        </p>
      </div>
    </article>
  );
}
