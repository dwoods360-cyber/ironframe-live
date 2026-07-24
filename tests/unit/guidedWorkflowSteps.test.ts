import { describe, expect, it } from "vitest";

import {
  GUIDED_DEMO_COMPANY,
  GUIDED_WORKFLOW_STEPS,
} from "@/app/lib/demo/guidedWorkflowSteps";
import { DEMO_ORG_NAME } from "@/app/lib/demo/demoModeConstants";

describe("guidedWorkflowSteps", () => {
  it("uses the existing Acme demo identity — not invented customers", () => {
    expect(GUIDED_DEMO_COMPANY.name).toBe(DEMO_ORG_NAME);
    expect(GUIDED_DEMO_COMPANY.disclaimer.toLowerCase()).toMatch(/benchmark|demonstration/);
    expect(GUIDED_DEMO_COMPANY.sessionNotice.toLowerCase()).toContain("read-only");
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
    expect(GUIDED_WORKFLOW_STEPS.map((step) => step.chipLabel)).toEqual([
      "identify",
      "exposure",
      "controls",
      "evidence",
      "review",
      "remediate",
      "report",
    ]);
  });

  it("does not claim SOC 2 certification in demo copy", () => {
    const blob = JSON.stringify(GUIDED_WORKFLOW_STEPS).toLowerCase();
    expect(blob).not.toContain("soc 2 certified");
    expect(blob).not.toContain("soc2 certified");
  });

  it("keeps public buyer dictionary — no seed tenants, agent codenames, or Path B", () => {
    const blob = JSON.stringify({ GUIDED_DEMO_COMPANY, GUIDED_WORKFLOW_STEPS }).toLowerCase();
    for (const banned of [
      "medshield",
      "vaultbank",
      "gridcore",
      "irongate",
      "ironguard",
      "path b",
      "bigint",
      "sandbox fixture",
      "enclave",
      "acme-corp",
      "acorp-sandbox",
      "governance frame",
    ]) {
      expect(blob, `banned term leaked: ${banned}`).not.toContain(banned);
    }
  });
});
