import { describe, expect, it } from "vitest";
import { validateForensicJustification } from "@/app/utils/validateJustification";

describe("validateForensicJustification", () => {
  it("allows short strings without running quality checks", () => {
    expect(validateForensicJustification("x").ok).toBe(true);
    expect(validateForensicJustification("a".repeat(49)).ok).toBe(true);
  });

  it("rejects more than five identical consecutive characters", () => {
    const base = "a".repeat(6);
    const pad = " This is padding text to reach fifty characters for the forensic gate. 1234567890 end";
    const s = `${base}${pad}`;
    expect(s.length).toBeGreaterThanOrEqual(50);
    expect(validateForensicJustification(s).ok).toBe(false);
  });

  it("rejects known bypass substrings at forensic length", () => {
    const s = `${"asdfghjkl".repeat(6)} extra words to exceed fifty character minimum length here`;
    expect(validateForensicJustification(s).ok).toBe(false);
  });

  it("rejects low-diversity repeating patterns", () => {
    const s = "ab".repeat(30);
    expect(s.length).toBeGreaterThanOrEqual(50);
    expect(validateForensicJustification(s).ok).toBe(false);
  });

  it("accepts a plausible high-entropy sentence", () => {
    const s =
      "I reviewed Irongate telemetry, reconciled the tenant-scoped audit braid, and confirm closure aligns with our GRC posture.";
    expect(s.length).toBeGreaterThanOrEqual(50);
    expect(validateForensicJustification(s).ok).toBe(true);
  });
});
