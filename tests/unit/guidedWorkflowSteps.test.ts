import { describe, expect, it } from "vitest";

import {
  GUIDED_DEMO_COMPANY,
  GUIDED_WORKFLOW_STEPS,
} from "@/app/lib/demo/guidedWorkflowSteps";
import { DEMO_ORG_NAME, DEMO_WORKSPACE_SLUG } from "@/app/lib/demo/demoModeConstants";

describe("guidedWorkflowSteps", () => {
  it("uses the existing Acme sandbox identity — not invented customers", () => {
    expect(GUIDED_DEMO_COMPANY.name).toBe(DEMO_ORG_NAME);
    expect(GUIDED_DEMO_COMPANY.slug).toBe(DEMO_WORKSPACE_SLUG);
    expect(GUIDED_DEMO_COMPANY.disclaimer.toLowerCase()).toContain("demonstration data");
  });

  it("defines exactly seven buyer-language workflow steps", () => {
    expect(GUIDED_WORKFLOW_STEPS).toHaveLength(7);
    expect(GUIDED_WORKFLOW_STEPS.map((step) => step.id)).toEqual([
      "identify",
      "exposure",
      "controls",
      "evidence",
      "quarantine",
      "remediation",
      "report",
    ]);
  });

  it("does not claim SOC 2 certification in demo copy", () => {
    const blob = JSON.stringify(GUIDED_WORKFLOW_STEPS).toLowerCase();
    expect(blob).not.toContain("soc 2 certified");
    expect(blob).not.toContain("soc2 certified");
  });
});
