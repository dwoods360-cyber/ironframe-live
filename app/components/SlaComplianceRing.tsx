"use client";

type Props = {
  pipelineCount: number;
  slaBreachCount: number;
  /** From `GlobalTelemetry` — RSC may serialize `Date` to an ISO string at runtime. */
  oldestPipelineThreatAt: Date | string | null;
};

const CX = 50;
const CY = 50;
const R = 38;
const STROKE = 6;
const CIRC = 2 * Math.PI * R;

const OPTIMAL_MAX_MIN = 150; // 2.5h
const BREACH_MIN_MIN = 240; // 4h

function ageInMinutesFromOldest(oldest: Date | string | null | undefined): number {
  if (oldest == null) return 0;
  const d = typeof oldest === "string" || typeof oldest === "number" ? new Date(oldest) : oldest;
  const t = d.getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, (Date.now() - t) / 60000);
}

/**
 * DMZ pipeline SLA ring: progressive timer (green → yellow → red) from oldest pipeline threat age.
 */
export default function SlaComplianceRing({
  pipelineCount,
  slaBreachCount,
  oldestPipelineThreatAt,
}: Props) {
  const idle = pipelineCount === 0;
  const ageInMinutes = ageInMinutesFromOldest(oldestPipelineThreatAt);

  const breach = !idle && (ageInMinutes >= BREACH_MIN_MIN || slaBreachCount > 0);
  const warning =
    !idle && !breach && ageInMinutes >= OPTIMAL_MAX_MIN && ageInMinutes < BREACH_MIN_MIN;
  const optimal = !idle && !breach && !warning;

  const ariaLabel = idle
    ? "SLA idle, no pipeline items"
    : breach
      ? "SLA breach, oldest DMZ threat at or beyond four hours or backlog breach count"
      : warning
        ? "SLA warning, oldest DMZ threat between two and a half and four hours"
        : "SLA optimal, oldest DMZ threat under two and a half hours";

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5" role="img" aria-label={ariaLabel}>
      <div className="relative h-14 w-14">
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full -rotate-90 text-slate-800"
          aria-hidden
        >
          {!idle ? (
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              className="text-slate-800"
              strokeOpacity={0.85}
            />
          ) : null}
          {idle ? (
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              strokeDasharray={`${CIRC * 0.88} ${CIRC}`}
              className="text-slate-600"
              strokeLinecap="round"
            />
          ) : null}
          {optimal ? (
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              strokeDasharray={`${CIRC} ${CIRC}`}
              className="text-emerald-500"
              strokeLinecap="round"
            />
          ) : null}
          {warning ? (
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              strokeDasharray={`${CIRC} ${CIRC}`}
              className="text-amber-500"
              strokeLinecap="round"
            />
          ) : null}
          {breach ? (
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              strokeDasharray={`${CIRC} ${CIRC}`}
              className="text-red-500"
              strokeLinecap="round"
            />
          ) : null}
        </svg>
      </div>
      <p className="max-w-[7rem] text-center text-[9px] font-semibold leading-tight tracking-wide text-slate-300">
        {idle ? (
          <>
            100% SLA <span className="text-slate-500">/</span>{" "}
            <span className="text-slate-400">0 Pending</span>
          </>
        ) : optimal ? (
          <>
            100% SLA <span className="text-slate-500">/</span>{" "}
            <span className="text-emerald-400">Safe</span>
          </>
        ) : warning ? (
          <>
            SLA WARNING <span className="text-slate-500">/</span>{" "}
            <span className="text-amber-400">&lt; 90m left</span>
          </>
        ) : (
          <span className="text-red-400">SLA BREACH DETECTED</span>
        )}
      </p>
    </div>
  );
}
