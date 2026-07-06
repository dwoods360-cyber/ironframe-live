"use client";

import { useEffect, useState } from "react";

const CITY_CYCLES = [
  "NEW YORK — LONDON — FRANKFURT",
  "WASHINGTON DC — TEL AVIV — OTTAWA",
  "SAN FRANCISCO — SEATTLE — AUSTIN",
  "TOKYO — TORONTO — MONTRÉAL",
] as const;

const CYCLE_MS = 4_000;

export default function MarketingCityCycleSubtitle() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % CITY_CYCLES.length);
    }, CYCLE_MS);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <p
      className="mt-2 min-h-[1.25rem] text-center font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400 transition-opacity duration-500 sm:text-xs sm:tracking-widest"
      aria-live="polite"
      aria-atomic="true"
      data-testid="marketing-city-cycle"
    >
      <span className="inline-block whitespace-nowrap">{CITY_CYCLES[activeIndex]}</span>
    </p>
  );
}
