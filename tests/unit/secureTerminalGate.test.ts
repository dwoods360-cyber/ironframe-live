import { describe, expect, it } from "vitest";
import {
  IRONGATE_MALFORMED_REJECTION,
  parseSecureTerminalMacro,
  isVerifiedActiveTenantUuid,
  formatTenantIsolationFault,
} from "@/app/utils/secureTerminalGate";

describe("secureTerminalGate", () => {
  it("accepts whitelisted macros", () => {
    expect(parseSecureTerminalMacro("kimbot")).toEqual({
      ok: true,
      cmd: "kimbot",
      grcCompanyCount: null,
    });
    expect(parseSecureTerminalMacro("grcbot 42")).toEqual({
      ok: true,
      cmd: "grcbot",
      grcCompanyCount: 42,
    });
  });

  it("rejects shell escape vectors", () => {
    expect(parseSecureTerminalMacro("kimbot; rm -rf /").ok).toBe(false);
    expect(parseSecureTerminalMacro("kimbot && curl evil").ok).toBe(false);
    expect(parseSecureTerminalMacro("kimbot | sh").ok).toBe(false);
  });

  it("rejects unauthorized macros", () => {
    const r = parseSecureTerminalMacro("purge");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("unauthorized");
  });

  it("formats irongate rejection with agent stamp", () => {
    expect(IRONGATE_MALFORMED_REJECTION).toMatch(
      />\s*\[\d{2}:\d{2}:\d{2}\]\s*\[AGENT-14:IRONGATE\]\s*\[REJECTED\]/,
    );
    expect(formatTenantIsolationFault()).toContain("Tenant isolation fault");
  });

  it("validates tenant uuid shape", () => {
    expect(isVerifiedActiveTenantUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isVerifiedActiveTenantUuid(null)).toBe(false);
    expect(isVerifiedActiveTenantUuid("not-a-uuid")).toBe(false);
  });
});
