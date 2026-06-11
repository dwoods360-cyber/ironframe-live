import { describe, expect, it } from "vitest";
import {
  formatSentinelSweepInitiatedLine,
  parseSentinelAgentInstruction,
  sanitizeSentinelInstructionInput,
  SENTINEL_INSTRUCTION_MAX_LENGTH,
} from "@/app/utils/sentinelInstructionGate";

describe("sentinelInstructionGate", () => {
  it("rejects empty and whitespace-only instructions", () => {
    expect(parseSentinelAgentInstruction("")).toEqual({ ok: false, reason: "empty" });
    expect(parseSentinelAgentInstruction("   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("rejects shell escape vectors", () => {
    expect(parseSentinelAgentInstruction("scan; rm -rf")).toEqual({ ok: false, reason: "escape" });
    expect(parseSentinelAgentInstruction("$(whoami)")).toEqual({ ok: false, reason: "escape" });
  });

  it("accepts valid instructions up to 256 chars", () => {
    const valid = "Validate CMMC AC-1 exposure for tenant edge.";
    const parsed = parseSentinelAgentInstruction(valid);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.sanitized).toBe(valid);
    }
    const long = "a".repeat(SENTINEL_INSTRUCTION_MAX_LENGTH);
    expect(parseSentinelAgentInstruction(long).ok).toBe(true);
    expect(parseSentinelAgentInstruction("a".repeat(SENTINEL_INSTRUCTION_MAX_LENGTH + 1))).toEqual({
      ok: false,
      reason: "length",
    });
  });

  it("neutralizes metacharacters on input sanitize", () => {
    expect(sanitizeSentinelInstructionInput("hello; world")).toBe("hello world");
    expect(sanitizeSentinelInstructionInput("a".repeat(300)).length).toBeLessThanOrEqual(
      SENTINEL_INSTRUCTION_MAX_LENGTH,
    );
  });

  it("formats sweep initiated stream line with timestamp prefix", () => {
    const line = formatSentinelSweepInitiatedLine(new Date("2026-06-07T12:34:56"));
    expect(line).toMatch(/^> \[\d{2}:\d{2}:\d{2}\] \[SYSTEM\] Sentinel Sweep initiated via manual macro instruction\.$/);
  });
});
