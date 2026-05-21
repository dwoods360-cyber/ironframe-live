import { describe, expect, it } from "vitest";
import {
  governanceMaturityToStripMetrics,
  maturitySnapshotToStripMetrics,
} from "@/app/lib/grcMaturityStripData";
import type { GovernanceMaturitySnapshot } from "@/app/types/governanceMaturity";

const baseSnapshot = (): GovernanceMaturitySnapshot => ({
  score: 4.6,
  calculatedAt: new Date().toISOString(),
  components: { attestationQuality: 5, chaosResilience: 6, directivity: 1 },
  weights: { attestation: 0.4, chaos: 0.35, directivity: 0.25 },
  governanceDegradationActive: true,
  neutralizeMinChars: 75,
  sampleSizes: { resolutionsSampled: 58, chaosReportAvailable: false },
});

describe("grcMaturityStripData", () => {
  it("maps snapshot to four forensic strip metrics", () => {
    const metrics = maturitySnapshotToStripMetrics(baseSnapshot());
    expect(metrics).toHaveLength(4);
    expect(metrics[0]).toMatchObject({
      label: "System Maturity",
      value: "4.6 / 10",
      sublabel: "↓ Governance drift",
    });
    expect(metrics[1]).toMatchObject({
      label: "Attestation Quality",
      value: "5 / 10",
      sublabel: "58 resolutions",
    });
    expect(metrics[2]).toMatchObject({
      label: "Chaos Resilience",
      value: "6 / 10",
      sublabel: "No chaos report",
    });
    expect(metrics[3]).toMatchObject({
      label: "Directivity",
      value: "1 / 10",
      sublabel: "Min neutralize 75 chars",
    });
  });

  it("returns pending metrics when snapshot is unavailable", () => {
    const metrics = governanceMaturityToStripMetrics(null);
    expect(metrics.every((m) => m.value === "Pending Integrity")).toBe(true);
  });
});
