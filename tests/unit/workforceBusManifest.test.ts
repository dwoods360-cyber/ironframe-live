import { describe, expect, it } from "vitest";
import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import {
  buildWorkforceSidecarLogs,
  getSovereignBusWorkforceCoverage,
  SOVEREIGN_BUS_ACTIVE_AGENT_INDICES,
  SOVEREIGN_BUS_ROSTER_SIZE,
  sovereignBusRosterDigest,
} from "@/src/services/orchestration/workforceBusManifest";

describe("workforceBusManifest (Epic 10)", () => {
  it("covers all 19 core workforce agents", () => {
    expect(SOVEREIGN_BUS_ROSTER_SIZE).toBe(19);
    expect(CORE_WORKFORCE_AGENTS).toHaveLength(19);
    const coverage = getSovereignBusWorkforceCoverage();
    expect(coverage).toHaveLength(19);
    expect(new Set(coverage.map((a) => a.index)).size).toBe(19);
  });

  it("partitions agents into active hot-path vs sidecar telemetry", () => {
    const coverage = getSovereignBusWorkforceCoverage();
    const active = coverage.filter((a) => a.participation === "active");
    const sidecar = coverage.filter((a) => a.participation === "sidecar");
    expect(active.length + sidecar.length).toBe(19);
    expect(active.map((a) => a.index).sort((a, b) => a - b)).toEqual(
      [...SOVEREIGN_BUS_ACTIVE_AGENT_INDICES].sort((a, b) => a - b),
    );
    expect(sidecar.length).toBeGreaterThan(0);
  });

  it("emits sidecar stamp lines for non-hot-path agents", () => {
    const sidecarLogs = buildWorkforceSidecarLogs();
    expect(sidecarLogs.length).toBe(19 - SOVEREIGN_BUS_ACTIVE_AGENT_INDICES.size);
    for (const log of sidecarLogs) {
      expect(log).toMatch(/SIDECAR:/);
    }
  });

  it("produces a stable roster digest for telemetry", () => {
    expect(sovereignBusRosterDigest()).toBe(
      CORE_WORKFORCE_AGENTS.map((a) => a.index).join(","),
    );
  });
});
