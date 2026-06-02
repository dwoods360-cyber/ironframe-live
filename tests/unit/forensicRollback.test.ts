import { describe, it, expect } from "vitest";
import type { CheckpointTuple } from "@langchain/langgraph-checkpoint";
import {
  EPIC_15_ROLLBACK_LOG_PREFIX,
  isForensicRollbackEligibleError,
  selectForensicRollbackAnchor,
} from "@/src/services/orchestration/forensicRollback";
import { TRANSACTION_ABORTED } from "@/src/services/orchestration/forensicFaultInjection";

function tuple(id: string, values: Record<string, unknown>, metadata?: CheckpointTuple["metadata"]): CheckpointTuple {
  return {
    config: { configurable: { thread_id: "t1", checkpoint_id: id } },
    checkpoint: {
      v: 4,
      id,
      ts: new Date().toISOString(),
      channel_values: values,
      channel_versions: {},
      versions_seen: {},
    },
    metadata: metadata ?? { source: "loop", step: 1, parents: {} },
  };
}

describe("forensicRollback — Epic 15", () => {
  it("detects rollback-eligible worker faults", () => {
    expect(isForensicRollbackEligibleError(new Error(`${TRANSACTION_ABORTED}: Irontrust`))).toBe(
      true,
    );
    expect(isForensicRollbackEligibleError(new Error("benign validation error"))).toBe(false);
  });

  it("selects anchor skipping checkpoints routed to persist", () => {
    const unsafe = tuple("cp-2", { tenant_id: "tenant-a", routingTarget: "persist" });
    const safe = tuple("cp-1", { tenant_id: "tenant-a", currentAssignee: "Agent_03_Irontrust" });
    const anchor = selectForensicRollbackAnchor([unsafe, safe]);
    expect(anchor?.checkpoint?.id).toBe("cp-1");
  });

  it("exports stable rollback log prefix for buyer diligence filters", () => {
    expect(EPIC_15_ROLLBACK_LOG_PREFIX).toBe("[epic15-forensic-rollback]");
  });
});
