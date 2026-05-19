import type { AttackCardProps } from "@/app/types/redTeamAttackCard";

export type { AttackCardProps } from "@/app/types/redTeamAttackCard";

export type RedTeamAttackCardProps = {
  /** Pre-trimmed/parsed attack row from ingress — no DB access in this component. */
  sanitizedData: AttackCardProps;
  /** Deck position: 0 = front/active (layered layout only). */
  stackIndex?: number;
  isActive?: boolean;
  /** `stack` = parent controls z-index / overlap; `layered` = inline deck offsets. */
  variant?: "stack" | "layered";
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function severityAccent(severity: AttackCardProps["severity"], isActive: boolean): string {
  switch (severity) {
    case "high":
      return cn(
        "border-red-500 shadow-[0_0_24px_rgba(239,68,68,0.45)]",
        isActive && "animate-pulse",
      );
    case "medium":
      return "border-red-600/90 shadow-[0_0_16px_rgba(220,38,38,0.35)]";
    case "low":
    default:
      return "border-red-900/80 shadow-[0_0_10px_rgba(127,29,29,0.35)]";
  }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * Dumb Red Team attack holder — presentation only.
 */
export default function RedTeamAttackCard({
  sanitizedData,
  stackIndex = 0,
  isActive = false,
  variant = "layered",
}: RedTeamAttackCardProps) {
  const { id, timestamp, vector, payload, severity } = sanitizedData;
  const depth = Math.min(stackIndex, 8);
  const isStack = variant === "stack";
  const translateY = isStack ? 0 : stackIndex * 14;
  const scale = isStack ? 1 : Math.max(0.9, 1 - stackIndex * 0.018);
  const zIndex = isStack ? undefined : 40 - stackIndex;
  const opacity = isStack ? 1 : isActive ? 1 : Math.max(0.55, 0.95 - stackIndex * 0.08);

  return (
    <article
      id={`red-team-attack-${id}`}
      className={cn(
        "relative w-full overflow-hidden rounded-lg border-2 bg-[#080204]/96 px-3 py-2.5 backdrop-blur-sm",
        "transition-[transform,opacity,box-shadow] duration-300 ease-out",
        severityAccent(severity, isActive),
      )}
      style={{
        ...(zIndex != null ? { zIndex } : {}),
        transform: isStack ? undefined : `translateY(${translateY}px) scale(${scale})`,
        opacity,
        boxShadow: [
          `0 ${3 + depth}px 0 0 rgba(69, 10, 10, 0.92)`,
          `0 ${6 + depth * 2}px ${14 + depth}px -4px rgba(0, 0, 0, 0.7)`,
          "inset 0 1px 0 0 rgba(248, 113, 113, 0.14)",
        ].join(", "),
      }}
      data-testid="red-team-attack-card"
      data-attack-id={id}
      data-attack-severity={severity}
      data-attack-active={isActive ? "true" : "false"}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-950/55 via-[#0a0406] to-black/80"
        aria-hidden
      />
      <div className="relative">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[9px] font-black uppercase tracking-[0.22em] text-red-400">
            Red Team
          </span>
          <span className="font-mono text-[9px] uppercase tabular-nums text-red-200/80">
            {formatTimestamp(timestamp)}
          </span>
        </div>
        <h3 className="line-clamp-2 text-xs font-bold leading-snug text-red-50">{vector}</h3>
        <p className="mt-1.5 line-clamp-3 font-mono text-[9px] leading-relaxed text-red-200/75">
          {payload}
        </p>
        <p className="mt-1.5 text-[8px] font-bold uppercase tracking-widest text-red-400/90">
          Severity · {severity}
        </p>
      </div>
    </article>
  );
}
