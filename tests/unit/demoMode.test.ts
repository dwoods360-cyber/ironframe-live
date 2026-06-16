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

  it("seeds corporate enclave and industry baselines as BigInt cents strings", () => {
    const scope = getDemoCommandCenterScope();
    expect(scope.tenants[0]).toMatchObject({
      id: DEMO_ENCLAVE_UUID,
      name: DEMO_ORG_NAME,
      slug: DEMO_WORKSPACE_SLUG,
    });

    const medshield = scope.tenants.find((t) => t.slug === "medshield");
    const vaultbank = scope.tenants.find((t) => t.slug === "vaultbank");
    const gridcore = scope.tenants.find((t) => t.slug === "gridcore");

    expect(medshield?.aleBaselineCents).toBe(DEMO_ALE_BASELINE_CENTS.medshield.toString());
    expect(vaultbank?.aleBaselineCents).toBe(DEMO_ALE_BASELINE_CENTS.vaultbank.toString());
    expect(gridcore?.aleBaselineCents).toBe(DEMO_ALE_BASELINE_CENTS.gridcore.toString());
  });
});
