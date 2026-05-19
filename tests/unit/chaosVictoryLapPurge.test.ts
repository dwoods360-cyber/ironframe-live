import { describe, expect, it } from "vitest";
import {
  chaosVictoryLapPurgeBlocked,
  isRemoteSupportAwaitingJitGrant,
  parseChaosScenarioFromIngestion,
} from "@/app/utils/forensicAttestation";

describe("chaosVictoryLapPurgeBlocked", () => {
  it("does not block Chaos 1 autonomous closure", () => {
    const ingestion = JSON.stringify({
      chaosScenario: "INTERNAL",
      isChaosTest: true,
      resolutionJustification: "[IRONTECH AUTONOMOUS RECOVERY] closed",
    });
    expect(parseChaosScenarioFromIngestion(ingestion)).toBe("INTERNAL");
    expect(chaosVictoryLapPurgeBlocked(ingestion)).toBe(false);
  });

  it("detects L4 MITIGATED + remoteSupportJitAwaitingGrant", () => {
    const ingestion = JSON.stringify({
      chaosScenario: "REMOTE_SUPPORT",
      isChaosTest: true,
      remoteSupportJitAwaitingGrant: true,
    });
    expect(isRemoteSupportAwaitingJitGrant("MITIGATED", ingestion)).toBe(true);
    expect(isRemoteSupportAwaitingJitGrant("CONFIRMED", ingestion)).toBe(false);
  });

  it("blocks Chaos 4 until remote handshake", () => {
    const ingestion = JSON.stringify({
      chaosScenario: "REMOTE_SUPPORT",
      isChaosTest: true,
      remoteSupportJitAwaitingGrant: true,
    });
    expect(chaosVictoryLapPurgeBlocked(ingestion)).toBe(true);
    expect(
      chaosVictoryLapPurgeBlocked(ingestion, { isRemoteAccessAuthorized: true }),
    ).toBe(false);
  });
});
