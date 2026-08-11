const CITY_CYCLES = [
  "NEW YORK — LONDON — FRANKFURT",
  "WASHINGTON DC — TEL AVIV — OTTAWA",
  "SAN FRANCISCO — SEATTLE — AUSTIN",
  "TOKYO — TORONTO — MONTRÉAL",
] as const;

type MarketingCityCycleSubtitleProps = {
  /** Optional size/spacing override (v2 brand-first hero). */
  className?: string;
};

/** CSS keyframe carousel with crossfade between city sets — no client JS required. Soft brand chrome under the mark. */
export default function MarketingCityCycleSubtitle({
  className = "mt-3 mb-1 min-h-[1.35rem] text-center font-mono text-xs uppercase tracking-[0.2em] text-slate-400/90 sm:min-h-[1.5rem] sm:text-sm sm:tracking-[0.22em]",
}: MarketingCityCycleSubtitleProps) {
  return (
    <p
      className={className}
      aria-live="polite"
      aria-atomic="true"
      data-testid="marketing-city-cycle"
    >
      <span className="inline-grid place-items-center">
        {CITY_CYCLES.map((cities, index) => (
          <span
            key={cities}
            className={`marketing-city-cycle-line marketing-city-cycle-line-${index} col-start-1 row-start-1 whitespace-nowrap`}
          >
            {cities}
          </span>
        ))}
      </span>
    </p>
  );
}
