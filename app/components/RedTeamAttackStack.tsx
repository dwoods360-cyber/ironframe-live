"use client";

import { AnimatePresence, motion } from "framer-motion";
import RiskCard from "@/app/components/RiskCard";
import { useRiskRegistryPartitions } from "@/app/hooks/useRiskRegistryPartitions";
import type { RiskDeckCardItem } from "@/app/types/riskCard";

export type RedTeamAttackStackProps = {
  initialStackCards?: RiskDeckCardItem[];
  className?: string;
};

/**
 * Vertical ACTIVE / brief RESOLVED dossier stack — newest on top (index 0, highest z-index).
 * RESOLVED rows unmount after the 4s linger window (see `useRiskRegistryPartitions`).
 */
export default function RedTeamAttackStack({
  initialStackCards = [],
  className = "",
}: RedTeamAttackStackProps) {
  const { activeStack: storeCards } = useRiskRegistryPartitions();
  const cards =
    storeCards.length > 0
      ? storeCards
      : initialStackCards.filter((c) => {
          const id = c.id?.trim();
          if (!id.startsWith("registry-")) return false;
          return c.processedData.status === "ACTIVE";
        });

  if (cards.length === 0) {
    return (
      <motion.div
        className={`w-full rounded-lg border border-dashed border-red-900/50 bg-red-950/10 px-4 py-10 text-center ${className}`.trim()}
        data-testid="red-team-attack-stack-empty"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-red-300/70">
          Attack stack idle
        </p>
        <p className="mt-1 text-[9px] text-red-200/50">
          ACTIVE risks appear here after REGISTERED processing.
        </p>
      </motion.div>
    );
  }

  const fanReservePx = 40 + Math.max(0, cards.length - 1) * 20;

  return (
    <motion.div
      className={`group/stack w-full ${className}`.trim()}
      data-testid="red-team-attack-stack"
      aria-label="Active risk stack"
      style={{ minHeight: 120 + cards.length * 56 + fanReservePx }}
    >
      <motion.div className="flex w-full flex-col items-center space-y-[-3rem] py-10" layout>
        <AnimatePresence mode="popLayout">
          {cards.map((item, index) => {
            const zIndex = cards.length - index;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative w-full shrink-0 will-change-transform group-hover/stack:-translate-y-5 hover:z-50 hover:-translate-y-5 hover:scale-[1.01]"
                style={{ zIndex }}
              >
                <RiskCard processedData={item.processedData} stackIndex={index} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
