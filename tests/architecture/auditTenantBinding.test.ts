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

    expect(freeze).toContain("getPrismaPrivileged().tenant.findMany");
    expect(freeze).toContain("withIronguardTenant(tenant.id");
    expect(freeze).not.toContain("prisma.tenant.findFirst");
    expect(freeze).not.toContain("resolveGovernanceTenantUuidForAudit");
  });

  it("fans Ironcast state-freeze audits out without a silent tenant fallback", () => {
    const escalation = source("src/services/ironcast/stateFreezeCisoEscalation.ts");

    expect(escalation).toContain("getPrismaPrivileged");
    expect(escalation).toContain("withIronguardTenant");
    expect(escalation).not.toContain("prisma.tenant.findFirst");
    expect(escalation).not.toContain("00000000-0000-0000-0000-000000000001");
    expect(escalation).not.toContain('from "@/lib/prisma"');
  });
});
