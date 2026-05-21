import type { ForensicChipTone } from "@/app/components/ui/ForensicMetricChip";
import type { GovernanceMaturitySnapshot } from "@/app/types/governanceMaturity";

export type GrcMaturityStripMetric = {
  id: string;
  label: string;
  value: string;
  sublabel: string;
  tone: ForensicChipTone;
  title?: string;
  testId: string;
};

const PENDING_METRICS: GrcMaturityStripMetric[] = [
  {
    id: "maturity-system",
    label: "System Maturity",
    value: "Pending Integrity",
    sublabel: "Ingress recalc unavailable",
    tone: "amber",
    testId: "grc-maturity-system",
  },
  {
    id: "maturity-attestation",
    label: "Attestation Quality",
    value: "Pending Integrity",
    sublabel: "Ingress recalc unavailable",
    tone: "cyan",
    testId: "grc-maturity-attestation",
  },
  {
    id: "maturity-chaos",
    label: "Chaos Resilience",
    value: "Pending Integrity",
    sublabel: "Ingress recalc unavailable",
    tone: "rose",
    testId: "grc-maturity-chaos",
  },
  {
    id: "maturity-directivity",
    label: "Directivity",
    value: "Pending Integrity",
    sublabel: "Ingress recalc unavailable",
    tone: "slate",
    testId: "grc-maturity-directivity",
  },
];

export function maturitySnapshotToStripMetrics(
  snapshot: GovernanceMaturitySnapshot,
): GrcMaturityStripMetric[] {
  const degradation = snapshot.governanceDegradationActive
    ? "↓ Governance drift"
    : "Within band";
  const chaosDelta = snapshot.sampleSizes.chaosReportAvailable
    ? "Post-mortem on file"
    : "No chaos report";
  const resolutionCount = snapshot.sampleSizes.resolutionsSampled;

  return [
    {
      id: "maturity-system",
      label: "System Maturity",
      value: `${snapshot.score.toFixed(1)} / 10`,
      sublabel: degradation,
      tone: "amber",
      title: "Weighted governance maturity score (0–10)",
      testId: "grc-maturity-system",
    },
    {
      id: "maturity-attestation",
      label: "Attestation Quality",
      value: `${snapshot.components.attestationQuality} / 10`,
      sublabel: `${resolutionCount} resolution${resolutionCount === 1 ? "" : "s"}`,
      tone: "cyan",
      title: "Resolution attestation quality from sampled ReasoningLog closures",
      testId: "grc-maturity-attestation",
    },
    {
      id: "maturity-chaos",
      label: "Chaos Resilience",
      value: `${snapshot.components.chaosResilience} / 10`,
      sublabel: chaosDelta,
      tone: "rose",
      title: "Irontech chaos post-mortem and drill recovery posture",
      testId: "grc-maturity-chaos",
    },
    {
      id: "maturity-directivity",
      label: "Directivity",
      value: `${snapshot.components.directivity} / 10`,
      sublabel: `Min neutralize ${snapshot.neutralizeMinChars} chars`,
      tone: "slate",
      title: "Neutralize justification depth and forensic directivity",
      testId: "grc-maturity-directivity",
    },
  ];
}

export function governanceMaturityToStripMetrics(
  snapshot: GovernanceMaturitySnapshot | null | undefined,
): GrcMaturityStripMetric[] {
  if (!snapshot) return PENDING_METRICS;
  return maturitySnapshotToStripMetrics(snapshot);
}
