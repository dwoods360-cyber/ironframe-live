import { describe, it, expect, beforeEach } from "vitest";
import {
  emitTelemetryPatchForTenant,
  getTelemetryPatchStreamSnapshot,
  resetTelemetryPatchStreamCache,
} from "@/src/services/orchestration/telemetryPatchStream";

describe("Epic 17 — telemetry stream integration", () => {
  beforeEach(() => {
    resetTelemetryPatchStreamCache();
  });

  it("emits sequential cumulative patches across multi-hop updates", () => {
    const tenantId = "tenant-stream-001";

    const hop1 = emitTelemetryPatchForTenant(tenantId, {
      status: "GREEN",
      steps: ["ironcore"],
    });
    expect(hop1.ok).toBe(true);
    if (!hop1.ok) return;
    expect(hop1.initialized).toBe(true);
    expect(hop1.patch.added).toEqual({
      status: "GREEN",
      steps: ["ironcore"],
    });

    const hop2 = emitTelemetryPatchForTenant(tenantId, {
      status: "GREEN",
      steps: ["ironcore", "ironwave"],
    });
    expect(hop2.ok).toBe(true);
    if (!hop2.ok) return;
    expect(hop2.initialized).toBe(false);
    expect(hop2.patch.added).toEqual({});
    expect(hop2.patch.updated).toEqual({
      steps: ["ironcore", "ironwave"],
    });
    expect(hop2.patch.unchangedCount).toBe(1);
  });

  it("returns threshold breach errors without crashing stream loop", () => {
    const tenantId = "tenant-stream-002";
    const baseline = emitTelemetryPatchForTenant(tenantId, { status: "GREEN" });
    expect(baseline.ok).toBe(true);

    const oversized = Array.from({ length: 500 }).reduce((acc: Record<string, bigint>, _, i) => {
      acc[`key_${i}`] = BigInt(i);
      return acc;
    }, {});

    const breach = emitTelemetryPatchForTenant(tenantId, oversized);
    expect(breach.ok).toBe(false);
    if (breach.ok) return;
    expect(breach.error).toContain("EPIC_17_PATCH_THRESHOLD_BREACHED");

    const recovery = emitTelemetryPatchForTenant(tenantId, {
      status: "AMBER",
      steps: ["ironcore", "ironwave"],
    });
    expect(recovery.ok).toBe(true);
  });

  it("maintains strict tenant isolation for per-tenant cached snapshots", () => {
    const tenantA = "tenant-alpha";
    const tenantB = "tenant-bravo";

    emitTelemetryPatchForTenant(tenantA, { status: "GREEN", step: "ironcore" });
    emitTelemetryPatchForTenant(tenantB, { status: "RED", step: "ironlock" });

    const patchA = emitTelemetryPatchForTenant(tenantA, {
      status: "GREEN",
      step: "ironwave",
    });
    expect(patchA.ok).toBe(true);
    if (!patchA.ok) return;
    expect(patchA.patch.updated).toEqual({ step: "ironwave" });
    expect(getTelemetryPatchStreamSnapshot(tenantB)).toEqual({
      status: "RED",
      step: "ironlock",
    });
  });
});
