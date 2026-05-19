import { describe, expect, it } from "vitest";
import { TAS_CHAOS_COMPLIANCE_DIRECTIVES } from "@/app/config/tasChaosComplianceDirectives";
import { DEAD_MAN_SWITCH_SIMULATION_TTL_MS } from "@/app/lib/deadMansSwitch";

describe("tasChaosComplianceDirectives", () => {
  it("includes Directive 4 isolation SLA at 1s", () => {
    const d4 = TAS_CHAOS_COMPLIANCE_DIRECTIVES.find((d) => d.id === "DIRECTIVE_4");
    expect(d4?.slaMs).toBe(1000);
    expect(d4?.tasLineRef).toBe(119);
  });
});

describe("simulation DMS window", () => {
  it("matches 240 second chaos collapse window", () => {
    expect(DEAD_MAN_SWITCH_SIMULATION_TTL_MS).toBe(240_000);
  });
});
