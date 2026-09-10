import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");

describe("Ironquery export tenant binding", () => {
  it("binds export history reads to the selected tenant", () => {
    const source = readFileSync(join(root, "app", "actions", "ironqueryExportActions.ts"), "utf8");
    expect(source).toContain("withIronguardTenant(scoped.scope.tenantId");
    expect(source).not.toContain("prisma.evidenceArtifact.findMany");
  });

  it("binds immutable archive metadata writes to the export tenant", () => {
    const source = readFileSync(join(root, "src", "services", "ironquery", "exportArchive.ts"), "utf8");
    expect(source).toContain("withIronguardTenant(tenantId");
    expect(source).not.toContain("prisma.evidenceArtifact.create");
  });
});
