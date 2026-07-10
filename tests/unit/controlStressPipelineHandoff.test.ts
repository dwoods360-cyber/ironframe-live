import { describe, expect, it } from "vitest";

import type { PipelineThreat } from "@/app/store/riskStore";
import {
  buildOptimisticControlStressPipelineThreat,
  mergePipelineWithPendingControlStressHandoffs,
} from "@/app/utils/controlStressPipelineHandoff";

describe("controlStressPipelineHandoff", () => {
  it("builds an IDENTIFIED HUMAN_SENTINEL pipeline card", () => {
    const row = buildOptimisticControlStressPipelineThreat("ISO27001 Annex A.8.32", "cmabc123");
    expect(row.id).toBe("cmabc123");
    expect(row.name).toContain("Control Stress Test");
    expect(row.source).toBe("HUMAN_SENTINEL");
    expect(row.threatStatus).toBe("IDENTIFIED");
    expect(row.isLocalOnly).toBe(true);
  });

  it("keeps optimistic handoff visible until DB row arrives", () => {
    const pending = buildOptimisticControlStressPipelineThreat("CC6.1", "stress-1");
    const existing: PipelineThreat[] = [pending];
    const mergedEmpty = mergePipelineWithPendingControlStressHandoffs([], existing);
    expect(mergedEmpty).toHaveLength(1);
    expect(mergedEmpty[0]?.id).toBe("stress-1");

    const fromDb: PipelineThreat[] = [
      {
        ...pending,
        isLocalOnly: false,
        description: "from db",
      },
    ];
    const merged = mergePipelineWithPendingControlStressHandoffs(fromDb, existing);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.isLocalOnly).toBe(false);
  });
});
