"use client";

import { useMemo } from "react";
import RiskCard from "@/app/components/RiskCard";
import { useRiskRegistryPartitions } from "@/app/hooks/useRiskRegistryPartitions";
import { DASHBOARD_CENTER_PAD_X } from "@/app/lib/dashboardTripaneLayout";
import type { RiskDeckCardItem } from "@/app/types/riskCard";

/** Server RSC ingress + client `useRiskRegistryStore` can list the same registry row after chaos L4 inject. */
function dedupeRiskDeckCards(items: RiskDeckCardItem[]): RiskDeckCardItem[] {
  const seen = new Set<string>();
  const out: RiskDeckCardItem[] = [];
  for (const item of items) {
    const key = item.id?.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export type GovernanceIngressProps = {
  cards?: RiskDeckCardItem[];
  registryIngressCards?: RiskDeckCardItem[];
  className?: string;
};

/**
 * Full-bleed horizontal governance birth lane — top of center pane.
 */
export default function GovernanceIngress({
  cards = [],
  registryIngressCards = [],
  className = "",
}: GovernanceIngressProps) {
  const { ingress: lifecycleIngress } = useRiskRegistryPartitions();
  const merged = useMemo(
    () => dedupeRiskDeckCards([...registryIngressCards, ...lifecycleIngress, ...cards]),
    [registryIngressCards, lifecycleIngress, cards],
  );

  if (merged.length === 0) return null;

  return (
    <section
      className={`w-full shrink-0 border-b border-slate-800/60 bg-slate-950/80 ${className}`.trim()}
      data-testid="governance-ingress"
      aria-label="Governance ingress"
    >
      <p
        className={`${DASHBOARD_CENTER_PAD_X} pt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400`}
      >
        Risk Deck · Governance Ingress
      </p>
      <div
        className={`flex w-full flex-row items-stretch gap-5 overflow-x-auto overscroll-x-contain py-5 ${DASHBOARD_CENTER_PAD_X} [scrollbar-gutter:stable]`}
      >
        {merged.map((item) => (
          <div key={item.id} className="w-[15.5rem] min-w-[15.5rem] shrink-0">
            <RiskCard processedData={item.processedData} stackIndex={0} compact={false} />
          </div>
        ))}
      </div>
    </section>
  );
}
