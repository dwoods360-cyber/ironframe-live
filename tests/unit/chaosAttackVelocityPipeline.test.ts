import { describe, expect, it } from "vitest";
import {
  belongsOnAttackVelocityPipeline,
  isChaosMarkedThreat,
  isInRemoteSupportAttackVelocityWindow,
  isIrontechChaosDrillEntity,
  isSystemIntegrityDrillThreat,
  REMOTE_SUPPORT_L4_PIPELINE_VISIBLE_MS,
} from "@/app/utils/chaosDiscoveryHold";

const SYSTEM_INTEGRITY_GRCBOT = JSON.stringify({
  chaosScenario: "REMOTE_SUPPORT",
  isChaosTest: true,
  incident_type: "CHAOS",
  category: "INFRASTRUCTURE",
});

const L4_INGESTION = JSON.stringify({
  chaosScenario: "REMOTE_SUPPORT",
  isChaosTest: true,
  entityType: "CHAOS_DRILL",
});

describe("belongsOnAttackVelocityPipeline", () => {
  it("allows non-chaos pipeline rows regardless of status", () => {
    expect(
      belongsOnAttackVelocityPipeline({
        threatStatus: "MITIGATED",
        ingestionDetails: JSON.stringify({ source: "scout" }),
        createdAt: new Date().toISOString(),
      }),
    ).toBe(true);
  });

  it("keeps fresh L4 MITIGATED on Attack Velocity during L4 handoff window", () => {
    expect(isChaosMarkedThreat({ threatStatus: "MITIGATED", ingestionDetails: L4_INGESTION })).toBe(
      true,
    );
    const createdAt = new Date().toISOString();
    expect(
      isInRemoteSupportAttackVelocityWindow({
        threatStatus: "MITIGATED",
        ingestionDetails: L4_INGESTION,
        createdAt,
      }),
    ).toBe(true);
    expect(
      belongsOnAttackVelocityPipeline({
        threatStatus: "MITIGATED",
        ingestionDetails: L4_INGESTION,
        createdAt,
      }),
    ).toBe(true);
  });

  it("excludes L4 MITIGATED after handoff window", () => {
    const stale = new Date(Date.now() - REMOTE_SUPPORT_L4_PIPELINE_VISIBLE_MS - 50).toISOString();
    expect(
      belongsOnAttackVelocityPipeline({
        threatStatus: "MITIGATED",
        ingestionDetails: L4_INGESTION,
        createdAt: stale,
      }),
    ).toBe(false);
  });

  it("excludes resolved L4 from Attack Velocity", () => {
    expect(
      belongsOnAttackVelocityPipeline({
        threatStatus: "RESOLVED",
        ingestionDetails: L4_INGESTION,
        createdAt: new Date().toISOString(),
      }),
    ).toBe(false);
  });

  it("detects Simulation Bot A–C from display label when drill id is missing", () => {
    const labelOnly = JSON.stringify({
      isChaosTest: true,
      chaosScenario: "HOME_SERVER",
      chaosScenarioDisplayLabel: "System Integrity Drill — KIMBOT",
    });
    expect(isSystemIntegrityDrillThreat({ ingestionDetails: labelOnly })).toBe(true);
  });

  it("keeps Simulation Bot A–C rows on Attack Velocity (no CHAOS_DRILL entity)", () => {
    const withDrillId = JSON.stringify({
      ...JSON.parse(SYSTEM_INTEGRITY_GRCBOT),
      systemIntegrityDrillId: "grcbot",
    });
    expect(isChaosMarkedThreat({ ingestionDetails: withDrillId })).toBe(true);
    expect(isIrontechChaosDrillEntity({ ingestionDetails: withDrillId })).toBe(false);
    expect(
      belongsOnAttackVelocityPipeline({
        threatStatus: "MITIGATED",
        ingestionDetails: withDrillId,
        createdAt: new Date().toISOString(),
      }),
    ).toBe(true);
  });

  it("includes non-L4 Irontech chaos only during IDENTIFIED discovery window", () => {
    const l1 = JSON.stringify({
      chaosScenario: "INTERNAL",
      isChaosTest: true,
      entityType: "CHAOS_DRILL",
    });
    const createdAt = new Date().toISOString();
    expect(
      belongsOnAttackVelocityPipeline({
        threatStatus: "IDENTIFIED",
        ingestionDetails: l1,
        createdAt,
      }),
    ).toBe(true);

    const stale = new Date(Date.now() - 10_000).toISOString();
    expect(
      belongsOnAttackVelocityPipeline({
        threatStatus: "IDENTIFIED",
        ingestionDetails: l1,
        createdAt: stale,
      }),
    ).toBe(false);
  });
});
