import { describe, expect, it } from "vitest";
import {
  ensureResolvedAtStamped,
  isActiveStackEligible,
  isWithinResolvedLingerWindow,
  RISK_REGISTRY_RESOLVED_LINGER_MS,
} from "@/app/utils/riskRegistryActiveStack";
import type { RiskRegistryRecord } from "@/app/types/riskLifecycle";

function row(partial: Partial<RiskRegistryRecord> & Pick<RiskRegistryRecord, "lifecycleStatus">): RiskRegistryRecord {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    tenantId: "5c420f5a-0000-4000-8000-000000000001",
    title: "Test",
    telemetryValue: "$1.0M",
    deltaLabel: "",
    sourceAgent: "KIMBOT",
    riskEventId: null,
    ingestionDetails: null,
    createdAt: "2026-05-18T00:00:00.000Z",
    updatedAt: "2026-05-18T00:00:00.000Z",
    ...partial,
  };
}

describe("riskRegistryActiveStack", () => {
  it("keeps RESOLVED only inside 4s linger window", () => {
    const now = Date.parse("2026-05-18T12:00:04.000Z");
    const resolvedAt = "2026-05-18T12:00:00.500Z";
    expect(isWithinResolvedLingerWindow(resolvedAt, now)).toBe(true);
    expect(
      isWithinResolvedLingerWindow(resolvedAt, now + RISK_REGISTRY_RESOLVED_LINGER_MS),
    ).toBe(false);
  });

  it("activeStack includes ACTIVE and young RESOLVED only", () => {
    const now = Date.parse("2026-05-18T12:00:03.000Z");
    expect(isActiveStackEligible(row({ lifecycleStatus: "ACTIVE" }), now)).toBe(true);
    expect(
      isActiveStackEligible(
        row({
          lifecycleStatus: "RESOLVED",
          resolvedAt: "2026-05-18T12:00:00.000Z",
        }),
        now,
      ),
    ).toBe(true);
    expect(
      isActiveStackEligible(
        row({
          lifecycleStatus: "RESOLVED",
          resolvedAt: "2026-05-18T11:59:00.000Z",
        }),
        now,
      ),
    ).toBe(false);
  });

  it("stamps missing resolvedAt for RESOLVED linger eligibility", () => {
    const now = Date.parse("2026-05-18T12:00:02.000Z");
    const bare = row({
      lifecycleStatus: "RESOLVED",
      resolvedAt: null,
      updatedAt: "2026-05-18T12:00:00.000Z",
    });
    const stamped = ensureResolvedAtStamped(bare);
    expect(stamped.resolvedAt).toBe("2026-05-18T12:00:00.000Z");
    expect(isActiveStackEligible(stamped, now)).toBe(true);
  });
});
