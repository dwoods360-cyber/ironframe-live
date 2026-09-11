import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Audit Intelligence tenant binding", () => {
  it("binds tenant-scoped audit reads, bot receipts, and signed exports", () => {
    const actions = source("app/actions/auditActions.ts");

    expect(actions.match(/withIronguardTenant\(/g)?.length).toBeGreaterThanOrEqual(8);
    expect(actions).not.toContain("prisma.auditLog.findMany");
    expect(actions).not.toContain("prisma.integrityEvent.findMany");
    expect(actions).not.toContain("prisma.evidenceArtifact.findMany");
    expect(actions).not.toContain("prisma.botAuditLog.create");
  });

  it("fans global freeze audits out without choosing a fallback tenant", () => {
    const freeze = source("src/services/ironlock/freezeEngine.ts");

    expect(freeze).toContain("prisma.tenant.findMany");
    expect(freeze).toContain("withIronguardTenant(tenant.id");
    expect(freeze).not.toContain("prisma.tenant.findFirst");
    expect(freeze).not.toContain("resolveGovernanceTenantUuidForAudit");
  });
});
