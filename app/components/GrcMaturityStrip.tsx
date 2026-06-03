"use client";

import ForensicMetricChip from "@/app/components/ui/ForensicMetricChip";
import ContextualHelpTrigger from "@/app/components/HelpSystem/ContextualHelpTrigger";
import { governanceMaturityToStripMetrics } from "@/app/lib/grcMaturityStripData";
import type { GovernanceMaturitySnapshot } from "@/app/types/governanceMaturity";

export type GrcMaturityStripProps = {
  maturity?: GovernanceMaturitySnapshot | null;
  className?: string;
};

/**
 * Horizontal GRC maturity forensic chips — re-homed from the retired Governance Ingress deck.
 * Stage-1 registry ingress remains in logs and assignee history (Irongate), not this strip.
 */
export default function GrcMaturityStrip({ maturity = null, className = "" }: GrcMaturityStripProps) {
  const metrics = governanceMaturityToStripMetrics(maturity);

  return (
    <section
      className={`w-full min-w-0 ${className}`.trim()}
      data-testid="grc-maturity-strip"
      aria-label="GRC maturity forensic strip"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          GRC maturity
        </p>
        <ContextualHelpTrigger
          featureId="ux-005"
          title="System Maturity Scoring Track"
          location="Placed at the top section of the left-hand column panel."
          purpose="Provides a real-time high-level technical grading score of the selected company's defense posture."
          steps={[
            "Read the large white numeric grading status value (e.g., 4.5 / 10).",
            "Observe the small green Month-Over-Month (+1.2 MoM) trend line beneath it.",
            "Switch companies and verify that this number updates deterministically to reflect that specific entity.",
          ]}
        />
      </div>
      <div className="flex min-w-0 flex-wrap items-stretch gap-2">
        {metrics.map((metric) => (
          <ForensicMetricChip
            key={metric.id}
            label={metric.label}
            value={metric.value}
            sublabel={metric.sublabel}
            tone={metric.tone}
            title={metric.title}
            testId={metric.testId}
          />
        ))}
      </div>
    </section>
  );
}
