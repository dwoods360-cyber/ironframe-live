import { describe, it, expect } from "vitest";
import { diffTelemetryState, TelemetryPatch } from "../../src/services/telemetry/stateDiffer";

describe("Epic 17 — Ironwave Telemetry State Differ", () => {
  const tenantId = "tenant-prod-99";

  it("should return an empty patch matrix for identical snapshots", () => {
    const previous = { status: "GREEN", metrics: { activeAgents: 19n } };
    const next = { status: "GREEN", metrics: { activeAgents: 19n } };

    const result = diffTelemetryState(previous, next, tenantId);

    expect(result).toEqual({
      added: {},
      updated: {},
      removed: [],
      unchangedCount: 2,
      tenantId,
    } satisfies TelemetryPatch);
  });

  it("should isolate a precise nested object update and support bigints", () => {
    const previous = { status: "GREEN", metrics: { cpu: 45n, ram: 1024n } };
    const next = { status: "GREEN", metrics: { cpu: 88n, ram: 1024n } };

    const result = diffTelemetryState(previous, next, tenantId);

    expect(result.updated).toEqual({ "metrics.cpu": 88n });
    expect(result.unchangedCount).toBe(2); // status and metrics.ram
  });

  it("should track deleted keys into the removed collection", () => {
    const previous = { status: "GREEN", temporaryDebugTrace: "degraded_upstream" };
    const next = { status: "GREEN" };

    const result = diffTelemetryState(previous, next, tenantId);

    expect(result.removed).toContain("temporaryDebugTrace");
    expect(result.updated).toEqual({});
  });

  it("should output added or updated keys in a deterministic alphabetized order", () => {
    const previous = {};
    const next = { z_metric: 100n, a_metric: 50n };

    const result = diffTelemetryState(previous, next, tenantId);
    const keys = Object.keys(result.added);

    expect(keys).toEqual(["a_metric", "z_metric"]);
  });

  it("should fail closed with a strict runtime exception if a float is detected", () => {
    const previous = { value: 100n };
    const next = { value: 100.45 }; // Forbidden float representation

    expect(() => diffTelemetryState(previous, next, tenantId)).toThrow(
      "EPIC_17_DIFF_FLOAT_BLOCKED",
    );
  });

  it("should fail closed if payload sizing flags breach the maximum threshold", () => {
    const previous = {};
    const next = Array.from({ length: 500 }).reduce((acc: Record<string, bigint>, _, i) => {
      acc[`key_${i}`] = BigInt(i);
      return acc;
    }, {});

    expect(() => diffTelemetryState(previous, next, tenantId)).toThrow(
      "EPIC_17_PATCH_THRESHOLD_BREACHED",
    );
  });
});
