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
const CRM_RLS_PATH = join(REPO_ROOT, "prisma", "scripts", "ironboard_crm_rls.sql");
const PRISMA_CLIENT_PATH = join(REPO_ROOT, "lib", "prisma.ts");
const THREAT_ACTIONS_PATH = join(REPO_ROOT, "app", "actions", "threatActions.ts");
const THREAT_TENANT_MIGRATION_PATH = join(
  REPO_ROOT,
  "prisma",
  "migrations",
  "20260911120000_threat_event_direct_tenant_scope",
  "migration.sql",
);
const CHECKPOINT_TENANT_MIGRATION_PATH = join(
  REPO_ROOT,
  "prisma",
  "migrations",
  "20260917120000_langgraph_checkpoint_tenant_key",
  "migration.sql",
);

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
  const crmRollout = readFileSync(CRM_RLS_PATH, "utf8");
  const prismaClient = readFileSync(PRISMA_CLIENT_PATH, "utf8");
  const threatActions = readFileSync(THREAT_ACTIONS_PATH, "utf8");
  const threatTenantMigration = readFileSync(THREAT_TENANT_MIGRATION_PATH, "utf8");
  const checkpointTenantMigration = readFileSync(CHECKPOINT_TENANT_MIGRATION_PATH, "utf8");

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
    expect(crmRollout).toContain("AS PERMISSIVE");
    expect(crmRollout).toContain("tenant_access_base_ironboard_crm_contacts");
    expect(crmRollout).toMatch(/USING \(true\) WITH CHECK \(true\)/);
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

  it("gives ThreatEvent a direct, fail-closed UUID tenant boundary", () => {
    const threatBlock = schema.slice(
      schema.indexOf("model ThreatEvent"),
      schema.indexOf("model AgentReasoning"),
    );
    expect(threatBlock).toMatch(/tenantId\s+String\s+@map\("tenant_id"\)\s+@db\.Uuid/);
    expect(threatTenantMigration).toContain('SET LOCAL app.worm_threat_event_bypass = \'1\'');
    expect(threatTenantMigration).toContain('WHERE "tenant_id" IS NULL');
    expect(threatTenantMigration).toContain("RAISE EXCEPTION");
    expect(threatTenantMigration).toContain('ALTER COLUMN "tenant_id" SET NOT NULL');
    expect(threatTenantMigration).toContain("ironguard_validate_threat_event_tenant_trigger");
    expect(threatTenantMigration).toContain('company."tenantId" = NEW."tenant_id"');
  });

  it("scopes indirect production-threat ledgers through their ThreatEvent parent", () => {
    for (const table of ["agent_reasoning", "AgentOperation", "WorkNote", "SustainabilityMetric"]) {
      expect(rollout).toContain(`('${table}',`);
    }
    expect(rollout).toContain('FROM public."ThreatEvent" threat');
    expect(rollout).toContain("threat.tenant_id::text = current_setting");
  });

  it("does not grant BYPASSRLS to the application role", () => {
    expect(rollout).toContain("rolbypassrls");
    expect(rollout).toContain("ironframe_app has prohibited elevated attributes");
    expect(rollout).not.toMatch(/^\s*ALTER ROLE ironframe_app BYPASSRLS/m);
  });

  it("does not attribute audit rows to an arbitrary fallback tenant", () => {
    const resolver = prismaClient.slice(
      prismaClient.indexOf("async function resolveAuditTenantId"),
      prismaClient.indexOf("return base.$extends"),
    );
    expect(resolver).not.toContain("base.tenant.findFirst");
    expect(resolver).toContain("tenant context could not be resolved");
  });

  it("never binds a company bigint as the RLS tenant UUID", () => {
    const transactionWrapper = threatActions.slice(
      threatActions.indexOf("async function runThreatTransaction"),
      threatActions.indexOf("export type AcknowledgeThreatActionResult"),
    );
    expect(transactionWrapper).toContain("select: { tenantId: true }");
    expect(transactionWrapper).toContain("withIronguardTenant");
    expect(transactionWrapper).toContain("IRONGUARD_SESSION_TENANT_UUID_REQUIRED");
    expect(transactionWrapper).not.toMatch(
      /set_config\('app\.current_tenant_id',\s*\$\{tenantCompanyId\.toString\(\)\}/,
    );
  });

  it("gives LangGraph checkpoint tables a database tenant key", () => {
    expect(checkpointTenantMigration).toContain("ironguard_arm_langgraph_checkpoint_tenant_keys");
    expect(checkpointTenantMigration).toContain("LANGGRAPH_CHECKPOINT_TENANT_REQUIRED");
    expect(checkpointTenantMigration).toContain("checkpoint_blobs");
    expect(checkpointTenantMigration).toContain("checkpoint_writes");
    expect(checkpointTenantMigration).toContain("ironguard_stamp_langgraph_checkpoint_tenant");
    expect(rollout).toContain("ironguard_arm_langgraph_checkpoint_tenant_keys");
  });
});
