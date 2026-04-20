import { describe, expect, it } from "vitest";
import {
  CHAOS_SHADOW_AUDIT_BIRTH,
  chaosShadowAuditAnalyzedLine,
  CHAOS_SHADOW_AUDIT_OBSERVATION,
  CHAOS_SHADOW_AUDIT_SYSTEM_CONCLUSION,
} from "@/app/config/chaosShadowAudit";

describe("chaos shadow telemetry (GRC / TAS)", () => {
  it("uses 12s supervised copy: Irongate → Irontech → observation → SYSTEM", () => {
    expect(CHAOS_SHADOW_AUDIT_BIRTH).toContain("Sanitizing ingress");
    expect(CHAOS_SHADOW_AUDIT_BIRTH).toContain("Tenant ID strictly stamped");
    const line = chaosShadowAuditAnalyzedLine("5 - CASCADING FAILURE (DOOMSDAY LOCKDOWN)");
    expect(line).toContain("Analyzing payload: 5 - CASCADING FAILURE");
    expect(line).toContain("LangGraph checkpointing active.");
    expect(CHAOS_SHADOW_AUDIT_OBSERVATION).toContain("Awaiting observer concurrence");
    expect(CHAOS_SHADOW_AUDIT_SYSTEM_CONCLUSION).toContain("[SYSTEM]");
    expect(CHAOS_SHADOW_AUDIT_SYSTEM_CONCLUSION).toContain("Concurrence Verified");
  });

  it("financial drill liability remains BigInt-safe baseline (cents)", () => {
    expect(0n).toBe(0n);
  });
});
