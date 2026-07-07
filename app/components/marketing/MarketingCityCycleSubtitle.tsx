const CITY_CYCLES = [
  "NEW YORK — LONDON — FRANKFURT",
  "WASHINGTON DC — TEL AVIV — OTTAWA",
  "SAN FRANCISCO — SEATTLE — AUSTIN",
  "TOKYO — TORONTO — MONTRÉAL",
] as const;

/** CSS keyframe carousel — no client JS; cycles even when prefers-reduced-motion is on. */
export default function MarketingCityCycleSubtitle() {
  return (
    <p
      className="mt-2 min-h-[1.25rem] text-center font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400 sm:text-xs sm:tracking-widest"
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
