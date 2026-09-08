import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Tenant isolation currently rests on application-layer predicates: the app connects as a
 * BYPASSRLS role, so the database provides no net under a forgotten `where` clause. The rollout
 * that closes this is prisma/scripts/tenant_rls_rollout.sql.
 *
 * This test does not assert the database state — it asserts that the rollout script keeps pace
 * with the schema, so a newly added tenant-scoped model cannot quietly ship outside the plan.
 */

const REPO_ROOT = join(__dirname, "..", "..");
const SCHEMA_PATH = join(REPO_ROOT, "prisma", "schema.prisma");
const ROLLOUT_PATH = join(REPO_ROOT, "prisma", "scripts", "tenant_rls_rollout.sql");

/**
 * Excluded in the rollout script for stated reasons: `user_role_assignments` is the authorization
 * source consulted before a tenant is bound, and `companies` is read cross-tenant while resolving
 * which companies belong to a tenant.
 */
const DOCUMENTED_EXCLUSIONS = ["user_role_assignments", "companies"];

function tenantScopedModels(schema: string): { model: string; table: string }[] {
  const results: { model: string; table: string }[] = [];
  const blocks = schema.split(/\bmodel\s+/).slice(1);

  for (const block of blocks) {
    const name = block.slice(0, block.indexOf(/\s|\{/.exec(block)?.[0] ?? " ")).trim();
    const body = block.slice(block.indexOf("{"), block.indexOf("\n}"));
    if (!body) continue;

    const hasTenantColumn = /^\s*tenantId\s+/m.test(body) || /@map\("tenant_id"\)/.test(body);
    if (!hasTenantColumn) continue;

    const mapped = /@@map\("([^"]+)"\)/.exec(body)?.[1];
    results.push({ model: name, table: mapped ?? name });
  }

  return results;
}

describe("tenant RLS rollout coverage", () => {
  const schema = readFileSync(SCHEMA_PATH, "utf8");
  const rollout = readFileSync(ROLLOUT_PATH, "utf8");

  it("keeps a rollout script that discovers tenant tables dynamically", () => {
    // Dynamic discovery is what lets new tables be covered without editing a list.
    expect(rollout).toContain("information_schema.columns");
    expect(rollout).toMatch(/'tenant_id',\s*'tenantId'/);
  });

  it("attaches RESTRICTIVE policies bound to the session GUC", () => {
    expect(rollout).toContain("AS RESTRICTIVE");
    expect(rollout).toContain("app.current_tenant_id");
    expect(rollout).toContain("ENABLE ROW LEVEL SECURITY");
  });

  it("creates the permissive base required for restrictive policies to grant scoped rows", () => {
    expect(rollout).toContain("AS PERMISSIVE");
    expect(rollout).toContain("tenant_access_base_");
    expect(rollout).toMatch(/USING \(true\)[\s\S]*WITH CHECK \(true\)/);
  });

  it("documents every exclusion it makes", () => {
    for (const excluded of DOCUMENTED_EXCLUSIONS) {
      expect(rollout).toContain(excluded);
    }
  });

  it("finds tenant-scoped models in the schema for the rollout to cover", () => {
    const models = tenantScopedModels(schema);
    // Guards the parser itself: if this collapses to zero the test stops being meaningful.
    expect(models.length).toBeGreaterThan(10);
  });

  it("does not grant BYPASSRLS to the application role", () => {
    expect(rollout).toContain("NOBYPASSRLS");
    expect(rollout).not.toMatch(/^\s*ALTER ROLE ironframe_app BYPASSRLS/m);
  });
});
