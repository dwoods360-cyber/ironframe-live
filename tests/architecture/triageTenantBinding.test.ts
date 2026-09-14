import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Irontech triage tenant binding", () => {
  it("passes the assessed tenant to both threat activity audit writes", () => {
    const router = source("src/services/irontech/triageRouter.ts");

    expect(router).toMatch(/tenantId,\r?\n\s*},/);
    expect(router).toContain("tenantId: input.tenantId");
  });

  it("binds explicit threat activity and health mirror writes to Ironguard", () => {
    const auditActions = source("app/actions/auditActions.ts");
    const monitor = source("src/services/irontech/healthPostureMonitor.ts");

    expect(auditActions).toContain("withIronguardTenant(tenantId");
    expect(auditActions).toContain("governance_tenant_uuid: tenantId");
    expect(monitor).toContain("withIronguardTenant(input.tenantId");
    expect(monitor).toContain("auditLogCreateLooseTx(tx");
  });
});
