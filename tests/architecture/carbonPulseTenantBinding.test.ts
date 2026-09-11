import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Carbon Pulse tenant binding", () => {
  it("binds the authenticated evidence lookup to the tenant session", () => {
    const route = source("app/api/grc/carbon-pulse/evidence/route.ts");

    expect(route).toContain("withIronguardTenant(tenantId");
    expect(route).toContain("where: { id: artifactId, tenantId }");
    expect(route).not.toContain("prisma.evidenceArtifact.findFirst");
  });

  it("binds every tenant-scoped Carbon Pulse ledger helper", () => {
    const service = source("app/services/ironbloom/carbonPulseService.ts");

    expect(service.match(/withIronguardTenant\(tenantId/g)).toHaveLength(4);
    expect(service).not.toContain("prisma.evidenceArtifact.findFirst");
    expect(service).not.toContain("prisma.evidenceAttachment.findFirst");
    expect(service).not.toContain("prisma.sustainabilityMetric");
  });
});
