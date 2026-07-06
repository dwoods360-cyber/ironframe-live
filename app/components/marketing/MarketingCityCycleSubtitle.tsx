const CITY_CYCLES = [
  "NEW YORK — LONDON — FRANKFURT",
  "WASHINGTON DC — TEL AVIV — OTTAWA",
  "SAN FRANCISCO — SEATTLE — AUSTIN",
  "TOKYO — TORONTO — MONTRÉAL",
] as const;

const CYCLE_MS = 4_000;
const TOTAL_CYCLE_MS = CITY_CYCLES.length * CYCLE_MS;

/** CSS-driven city rotation — no client timer; negative delays phase each line in the loop. */
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
            className="marketing-city-cycle-line col-start-1 row-start-1 whitespace-nowrap"
            style={{
              animationDuration: `${TOTAL_CYCLE_MS}ms`,
              animationDelay: `-${index * CYCLE_MS}ms`,
            }}
          >
            {cities}
          </span>
        ))}
      </span>
    </p>
  );
}
