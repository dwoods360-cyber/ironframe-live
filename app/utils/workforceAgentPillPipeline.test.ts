import { describe, expect, it, vi } from "vitest";
import {
  buildCheckpointFreezeMessage,
  runLocalizedDiagnosticAudit,
  SYSTEM_BASELINE_SUM_CENTS,
} from "./workforceAgentPillPipeline";

describe("workforceAgentPillPipeline", () => {
  it("runs localized audit with PASS when baseline sum matches", () => {
    const emit = vi.fn();
    const result = runLocalizedDiagnosticAudit("Irongate", emit);
    expect(SYSTEM_BASELINE_SUM_CENTS).toBe(2170000000n);
    expect(result.pass).toBe(true);
    expect(result.inlineLabel).toBe("PASS");
    expect(emit).toHaveBeenCalledWith(
      expect.stringContaining("[AUDIT] Irongate diagnostic PASS"),
    );
  });

  it("builds checkpoint freeze message for agent", () => {
    expect(buildCheckpointFreezeMessage("Ironlock")).toContain("Ironlock state FROZEN");
  });
});
