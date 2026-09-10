import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(__dirname, "..", "..", "app", "actions", "evidenceActions.ts"),
  "utf8",
);

describe("evidence request-path tenant binding", () => {
  it("runs tenant-scoped evidence operations through the Ironguard transaction wrapper", () => {
    expect(source).toContain('import { withIronguardTenant }');
    expect(source.match(/withIronguardTenant\(/g)).toHaveLength(3);
    expect(source).not.toContain("prisma.evidenceArtifact.create");
    expect(source).not.toContain("prisma.evidenceArtifact.findFirst");
    expect(source).not.toContain("prisma.evidenceAttachment.findMany");
  });

  it("checks authenticated tenant membership before attaching evidence", () => {
    const attachFlow = source.slice(
      source.indexOf("export async function attachEvidenceToThreat"),
      source.indexOf("export type EvidenceAttachmentListItem"),
    );
    expect(attachFlow).toContain("where: { userId, tenantId: tenantCtx.tenantId }");
    expect(attachFlow.indexOf("where: { userId, tenantId: tenantCtx.tenantId }")).toBeLessThan(
      attachFlow.indexOf("withIronguardTenant(tenantCtx.tenantId"),
    );
  });
});
