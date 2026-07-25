import { describe, expect, it } from "vitest";
import {
  DEMO_ENCLAVE_UUID,
  DEMO_ORG_NAME,
  DEMO_WORKSPACE_SLUG,
  DEMO_ALE_BASELINE_CENTS,
  isDemoPath,
  isDemoPublicPath,
  isDemoSandboxSlug,
} from "@/app/lib/demo/demoModeConstants";
import { getDemoCommandCenterScope } from "@/app/lib/demo/demoMode";
import { buildDemoPipelineThreats } from "@/app/lib/demo/demoMockThreats";

describe("demoMode", () => {
  it("identifies sandbox workspace slug", () => {
    expect(isDemoSandboxSlug("acorp-sandbox")).toBe(true);
    expect(isDemoSandboxSlug("acorp-demo")).toBe(false);
  });

  it("matches demo routes", () => {
    expect(isDemoPath("/demo/dashboard")).toBe(true);
    expect(isDemoPath("/register/demo")).toBe(false);
    expect(isDemoPublicPath("/register/demo")).toBe(true);
  });

  it("seeds corporate demo and industry baselines as BigInt cents strings", () => {
    const scope = getDemoCommandCenterScope();
    expect(scope.tenants[0]).toMatchObject({
      id: DEMO_ENCLAVE_UUID,
      name: DEMO_ORG_NAME,
      slug: DEMO_WORKSPACE_SLUG,
    });

    const healthcare = scope.tenants.find((t) => t.slug === "healthcare-demo");
    const finance = scope.tenants.find((t) => t.slug === "finance-demo");
    const infrastructure = scope.tenants.find((t) => t.slug === "infrastructure-demo");

    expect(healthcare?.aleBaselineCents).toBe(DEMO_ALE_BASELINE_CENTS.medshield.toString());
    expect(finance?.aleBaselineCents).toBe(DEMO_ALE_BASELINE_CENTS.vaultbank.toString());
    expect(infrastructure?.aleBaselineCents).toBe(DEMO_ALE_BASELINE_CENTS.gridcore.toString());
  });

  it("keeps buyer-facing demo labels — no synthetic seed-tenant names", () => {
    const blob = JSON.stringify({
      scope: getDemoCommandCenterScope(),
      threats: buildDemoPipelineThreats(),
    }).toLowerCase();
    for (const banned of ["medshield", "vaultbank", "gridcore", "irongate", "enclave"]) {
      expect(blob, `banned term leaked: ${banned}`).not.toContain(banned);
    }
  });
});
