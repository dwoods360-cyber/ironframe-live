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
          title="Operational Maturity Tracker"
          location="Positioned inside the upper section of the Center Panel (48% Screen Width), sitting right next to the active operational tabs."
          purpose="Provides an absolute, real-time numeric grade of the selected corporate entity's cybersecurity health and regulatory posture."
          steps={[
            "Look at the Operational Maturity Tracker block at the crown of your center console canvas.",
            "Read the white numeric fraction value (e.g., 4.5 / 10) and the green +1.2 MoM trend indicator.",
            "Change your corporate profile via the top-left dropdown and verify the tracker swaps values after the skeleton frame clears.",
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
