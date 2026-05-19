"use client";

import { useState } from "react";
import RiskCard from "@/app/components/RiskCard";
import { ForensicAuditModal } from "@/app/components/ForensicAuditModal";
import type { RiskDeckCardItem } from "@/app/types/riskCard";

export type RiskDeckProps = {
  cards: RiskDeckCardItem[];
  className?: string;
};

type ForensicModalState = {
  threatId: string;
  markdownAuditBlock: string;
} | null;

/**
 * Vertical stacked deck — narrow column so center telemetry does not crowd Audit Intelligence.
 * ForensicAuditModal is mounted once at the lane layer (portal), not per card.
 */
export default function RiskDeck({ cards, className = "" }: RiskDeckProps) {
  const [forensicModal, setForensicModal] = useState<ForensicModalState>(null);

  if (cards.length === 0) return null;

  return (
    <>
      <div
        className={`w-full max-w-sm flex-none ${className}`.trim()}
        data-testid="risk-deck"
        aria-label="Risk deck"
      >
        <div className="flex flex-col space-y-[-1.5rem] pb-2">
          {cards.map((item, index) => (
            <RiskCard
              key={item.id}
              processedData={item.processedData}
              stackIndex={index}
              onVerifyArtifact={
                item.processedData.markdownAuditBlock?.trim()
                  ? () =>
                      setForensicModal({
                        threatId: item.processedData.threatId ?? item.id,
                        markdownAuditBlock: item.processedData.markdownAuditBlock!.trim(),
                      })
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      <ForensicAuditModal
        isOpen={forensicModal != null}
        onClose={() => setForensicModal(null)}
        threatId={forensicModal?.threatId ?? ""}
        markdownAuditBlock={forensicModal?.markdownAuditBlock ?? ""}
      />
    </>
  );
}
