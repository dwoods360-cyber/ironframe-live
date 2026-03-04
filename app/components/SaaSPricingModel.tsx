"use client";

import { useComputeBilling } from "@/app/hooks/useComputeBilling";

const TIERS = [
  { name: "Silver", priceUsd: 100, tenantLimit: 5 },
  { name: "Gold", priceUsd: 500, tenantLimit: 25 },
  { name: "Platinum", priceUsd: 2_500, tenantLimit: 100 },
] as const;

export default function SaaSPricingModel() {
  const { monthlyBurnUsd, activeTenants } = useComputeBilling();

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        SaaS Pricing Calculator
      </p>
      <p className="mb-3 text-[11px] text-slate-500">
        Monthly Burn from simulation vs subscription tier. Tier in red when compute cost exceeds plan price.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TIERS.map((tier) => {
          const overLimit = activeTenants > tier.tenantLimit;
          const costExceedsPrice = monthlyBurnUsd > tier.priceUsd;
          const highlightRed = costExceedsPrice;
          return (
            <div
              key={tier.name}
              className={`rounded border p-3 ${
                highlightRed
                  ? "border-rose-500/70 bg-rose-500/10"
                  : "border-slate-800 bg-slate-900/30"
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-200">
                {tier.name}
              </p>
              <p className="mt-1 font-mono text-lg text-slate-100">
                ${tier.priceUsd.toLocaleString()}/mo
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Up to {tier.tenantLimit} tenants
              </p>
              <p className="mt-2 text-[10px] text-slate-400">
                Burn: ${monthlyBurnUsd.toFixed(2)}
                {costExceedsPrice && (
                  <span className="ml-1 font-semibold text-rose-400"> — exceeds plan</span>
                )}
              </p>
              {overLimit && (
                <p className="mt-1 text-[10px] text-amber-400">
                  Over tenant limit ({activeTenants} &gt; {tier.tenantLimit})
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
