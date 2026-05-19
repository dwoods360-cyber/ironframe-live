import RiskCard from "@/app/components/RiskCard";
import type { RiskDeckCardItem } from "@/app/types/riskCard";

export type RiskDeckProps = {
  cards: RiskDeckCardItem[];
  className?: string;
};

/**
 * Vertical stacked deck — narrow column so center telemetry does not crowd Audit Intelligence.
 */
export default function RiskDeck({ cards, className = "" }: RiskDeckProps) {
  if (cards.length === 0) return null;

  return (
    <div
      className={`w-full max-w-sm flex-none ${className}`.trim()}
      data-testid="risk-deck"
      aria-label="Risk deck"
    >
      <div className="flex flex-col space-y-[-1.5rem] pb-2">
        {cards.map((item, index) => (
          <RiskCard key={item.id} processedData={item.processedData} stackIndex={index} />
        ))}
      </div>
    </div>
  );
}
