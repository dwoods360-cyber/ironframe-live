"use client";

type Props = {
  isMarketVolatile: boolean;
};

/**
 * Flashes when ΔV > 0.20 (industry mean ALE week-over-week).
 */
export default function MarketVolatilityAlert({ isMarketVolatile }: Props) {
  if (!isMarketVolatile) return null;

  return (
    <div
      className="mb-3 rounded border-2 border-red-500 bg-red-950/95 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-red-100 shadow-[0_0_16px_rgba(239,68,68,0.55)] ring-2 ring-red-500/40 animate-pulse"
      role="alert"
    >
      <span className="text-red-300">MARKET VOLATILITY ALERT</span>
      <p className="mt-1 font-sans text-[9px] font-normal normal-case leading-snug tracking-normal text-red-100/95">
        Industry Spike Detected: Insurance Market Hardening. Auto-validating high-value controls.
      </p>
    </div>
  );
}
