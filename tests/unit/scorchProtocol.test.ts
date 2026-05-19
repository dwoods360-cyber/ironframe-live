import { describe, expect, it } from "vitest";

import { assertTenantScorchAllowed } from "@/app/lib/scorchProtocol";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

describe("assertTenantScorchAllowed", () => {
  it("allows known tenant UUID", () => {
    expect(() => assertTenantScorchAllowed(TENANT_UUIDS.medshield)).not.toThrow();
  });

  it("blocks global scorch", () => {
    expect(() => assertTenantScorchAllowed("global")).toThrow(/GLOBAL_SCORCH_FORBIDDEN/);
  });
});
