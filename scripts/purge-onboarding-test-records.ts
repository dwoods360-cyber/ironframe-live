/**
 * Purge onboarding test tenants (kim / dwoods) from remote Postgres + Supabase Auth.
 *
 * Usage:
 *   npx tsx scripts/purge-onboarding-test-records.ts          # dry-run (preview only)
 *   npx tsx scripts/purge-onboarding-test-records.ts --slug acorp --execute
 *
 * Slug matching is EXACT only (no substring). Seed tenants (medshield, vaultbank,
 * gridcore) are protected unless --allow-seed-tenants is passed.
 * Requires SUPABASE_SERVICE_ROLE_KEY to remove auth.users for linked test accounts.
 */
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const slugArgs = process.argv
  .filter((_, i) => process.argv[i - 1] === "--slug")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const MATCH_TERMS = (slugArgs.length > 0 ? slugArgs : ["kim", "dwoods"]) as readonly string[];
const EXECUTE = process.argv.includes("--execute");
const ALLOW_SEED = process.argv.includes("--allow-seed-tenants");

/** Constitutional seed workspaces — never purge unless --allow-seed-tenants. */
const PROTECTED_SEED_SLUGS = new Set(["medshield", "vaultbank", "gridcore", "defense"]);

function effectiveMatchTerms(): string[] {
  const terms: string[] = [];
  for (const term of MATCH_TERMS) {
    if (PROTECTED_SEED_SLUGS.has(term) && !ALLOW_SEED) {
      console.warn(
        `[purge] Skipping protected seed slug "${term}" — pass --allow-seed-tenants to override.`,
      );
      continue;
    }
    terms.push(term);
  }
  return terms;
}

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const prisma = new PrismaClient();

function tenantMatchFilter(terms: readonly string[]) {
  if (terms.length === 0) {
    return { id: { in: [] as string[] } };
  }
  return {
    OR: terms.map((term) => ({
      slug: { equals: term, mode: "insensitive" as const },
    })),
  };
}

async function deleteThreatPlaneForCompanies(companyIds: bigint[]) {
  if (companyIds.length === 0) return { threatEvents: 0 };

  const threats = await prisma.threatEvent.findMany({
    where: { tenantCompanyId: { in: companyIds } },
    select: { id: true },
  });
  const threatIds = threats.map((t) => t.id);
  if (threatIds.length === 0) return { threatEvents: 0 };

  await prisma.threatEvent.updateMany({
    where: { id: { in: threatIds } },
    data: { resolutionApprovalId: null },
  });

  await prisma.threatAssignment.deleteMany({ where: { threatId: { in: threatIds } } });
  await prisma.threatApproval.deleteMany({ where: { threatId: { in: threatIds } } });
  await prisma.auditLog.deleteMany({ where: { threatId: { in: threatIds } } });

  const deleted = await prisma.threatEvent.deleteMany({ where: { id: { in: threatIds } } });
  return { threatEvents: deleted.count };
}

async function deleteTenantScopedOrphans(tenantIds: string[], terms: readonly string[]) {
  if (tenantIds.length === 0) return {};

  const [
    userRoles,
    auditLogs,
    threatAssignments,
    threatApprovals,
    evidenceArtifacts,
    integrityEvents,
    integrityExports,
    auditReceipts,
    botAuditLogs,
    failedJobs,
    ironscoutTasks,
    cronArtifacts,
    quarantineRecords,
    agentCheckpoints,
    governedSessions,
    simDiagnostics,
    sentinelOutbox,
    riskRegistry,
    workspaceInvitations,
  ] = await Promise.all([
    prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: tenantIds } } }),
    prisma.auditLog.deleteMany({ where: { tenantId: { in: tenantIds } } }),
    prisma.threatAssignment.deleteMany({ where: { tenantId: { in: tenantIds } } }),
    prisma.threatApproval.deleteMany({ where: { tenantId: { in: tenantIds } } }),
    prisma.evidenceArtifact.deleteMany({ where: { tenantId: { in: tenantIds } } }),
    prisma.integrityEvent.deleteMany({ where: { tenantId: { in: tenantIds } } }),
    prisma.integrityExport.deleteMany({ where: { tenantId: { in: tenantIds } } }),
    prisma.auditReceipt.deleteMany({ where: { tenantId: { in: tenantIds } } }),
    prisma.botAuditLog.deleteMany({ where: { tenantId: { in: tenantIds } } }),
    prisma.failed_Jobs.deleteMany({ where: { tenant_id: { in: tenantIds } } }),
    prisma.ironscout_Tasks.deleteMany({ where: { tenant_id: { in: tenantIds } } }),
    prisma.cronJobArtifact.deleteMany({ where: { tenantId: { in: tenantIds } } }),
    prisma.quarantineRecord.deleteMany({ where: { tenantId: { in: tenantIds } } }),
    prisma.agentStateCheckpoint.deleteMany({ where: { tenantId: { in: tenantIds } } }),
    prisma.governedSession.deleteMany({ where: { tenantId: { in: tenantIds } } }),
    prisma.simulationDiagnosticLog.deleteMany({ where: { tenantUuid: { in: tenantIds } } }),
    prisma.sentinelAutomationOutbox.deleteMany({ where: { tenantScope: { in: tenantIds } } }),
    prisma.riskRegistry.deleteMany({ where: { tenantId: { in: tenantIds } } }),
    prisma.tenantWorkspaceInvitation.deleteMany({
      where: {
        tenantSlug: { in: [...terms] },
      },
    }),
  ]);

  return {
    userRoleAssignments: userRoles.count,
    auditLogs: auditLogs.count,
    threatAssignments: threatAssignments.count,
    threatApprovals: threatApprovals.count,
    evidenceArtifacts: evidenceArtifacts.count,
    integrityEvents: integrityEvents.count,
    integrityExports: integrityExports.count,
    auditReceipts: auditReceipts.count,
    botAuditLogs: botAuditLogs.count,
    failedJobs: failedJobs.count,
    ironscoutTasks: ironscoutTasks.count,
    cronJobArtifacts: cronArtifacts.count,
    quarantineRecords: quarantineRecords.count,
    agentStateCheckpoints: agentCheckpoints.count,
    governedSessions: governedSessions.count,
    simulationDiagnosticLogs: simDiagnostics.count,
    sentinelOutbox: sentinelOutbox.count,
    riskRegistry: riskRegistry.count,
    workspaceInvitations: workspaceInvitations.count,
  };
}

async function deleteOrphanInvitationsBySlug(terms: readonly string[]) {
  if (terms.length === 0) return { count: 0 };
  const result = await prisma.tenantWorkspaceInvitation.deleteMany({
    where: {
      OR: terms.map((term) => ({
        tenantSlug: { equals: term, mode: "insensitive" as const },
      })),
    },
  });
  return { count: result.count };
}

async function listAllSupabaseUsers(supabase: ReturnType<typeof createClient>) {
  const users: { id: string; email?: string; user_metadata?: Record<string, unknown> }[] = [];
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Supabase listUsers failed: ${error.message}`);
    users.push(
      ...data.users.map((u) => ({
        id: u.id,
        email: u.email,
        user_metadata: u.user_metadata as Record<string, unknown>,
      })),
    );
    if (data.users.length < perPage) break;
    page += 1;
  }
  return users;
}

async function deleteSupabaseUsersForTenantRoles(tenantIds: string[], terms: readonly string[]) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!serviceKey || !supabaseUrl) {
    return { skipped: true as const, reason: "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL" };
  }

  const roleRows = await prisma.userRoleAssignment.findMany({
    where: { tenantId: { in: tenantIds } },
    select: { userId: true },
  });
  const userIdsFromRoles = [...new Set(roleRows.map((r) => r.userId))];

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const allAuthUsers = await listAllSupabaseUsers(supabase);
  const metadataMatchedIds = allAuthUsers
    .filter((u) => {
      const slug = String(u.user_metadata?.tenant_slug ?? "").toLowerCase();
      return terms.some((term) => slug === term);
    })
    .map((u) => u.id);

  /** Only auth users tied to matched tenants — never broad email match (would hit dwoods360@gmail.com). */
  const allUserIds = [...new Set([...userIdsFromRoles, ...metadataMatchedIds])];
  const deleted: string[] = [];
  const errors: { userId: string; message: string }[] = [];

  for (const userId of allUserIds) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) errors.push({ userId, message: error.message });
    else deleted.push(userId);
  }

  return { skipped: false as const, deleted, errors, candidateCount: allUserIds.length };
}

async function deleteOrphanRolesForMatchedAuthUsers(terms: readonly string[]) {
  if (terms.length === 0) return { count: 0 };
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!serviceKey || !supabaseUrl) return { count: 0 };

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const allAuthUsers = await listAllSupabaseUsers(supabase);
  const matchedUserIds = allAuthUsers
    .filter((u) => {
      const slug = String(u.user_metadata?.tenant_slug ?? "").toLowerCase();
      return terms.some((term) => slug === term);
    })
    .map((u) => u.id);

  if (matchedUserIds.length === 0) return { count: 0 };

  const existingTenantIds = new Set(
    (await prisma.tenant.findMany({ select: { id: true } })).map((t) => t.id),
  );

  const orphanRoles = await prisma.userRoleAssignment.findMany({
    where: { userId: { in: matchedUserIds } },
    select: { id: true, tenantId: true, userId: true },
  });

  const toDelete = orphanRoles.filter((r) => !existingTenantIds.has(r.tenantId));
  if (toDelete.length === 0) return { count: 0 };

  const result = await prisma.userRoleAssignment.deleteMany({
    where: { id: { in: toDelete.map((r) => r.id) } },
  });
  return { count: result.count, tenantIds: [...new Set(toDelete.map((r) => r.tenantId))] };
}

async function deleteDanglingRoleAssignments() {
  const existingTenantIds = (
    await prisma.tenant.findMany({ select: { id: true } })
  ).map((t) => t.id);
  const allRoles = await prisma.userRoleAssignment.findMany({
    select: { id: true, tenantId: true },
  });
  const danglingIds = allRoles
    .filter((r) => !existingTenantIds.includes(r.tenantId))
    .map((r) => r.id);
  if (danglingIds.length === 0) return { count: 0 };
  const result = await prisma.userRoleAssignment.deleteMany({
    where: { id: { in: danglingIds } },
  });
  return { count: result.count };
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is not set (.env.local or .env).");
  }

  const terms = effectiveMatchTerms();

  console.log(`=== Purge onboarding test records (${EXECUTE ? "EXECUTE" : "DRY-RUN"}) ===`);
  console.log(`Exact slug terms: ${terms.length > 0 ? terms.join(", ") : "(none after filters)"}\n`);

  if (terms.length === 0) {
    console.log("Nothing to purge — all slug terms were filtered or omitted.");
    console.log("\nDry-run complete. Re-run with --execute to delete.");
    return;
  }

  const tenants = await prisma.tenant.findMany({
    where: tenantMatchFilter(terms),
    select: { id: true, slug: true, name: true },
  });
  const tenantIds = tenants.map((t) => t.id);

  const companies = await prisma.company.findMany({
    where: { tenantId: { in: tenantIds } },
    select: { id: true, name: true, tenantId: true },
  });
  const companyIds = companies.map((c) => c.id);

  const roleRows = tenantIds.length
    ? await prisma.userRoleAssignment.findMany({
        where: { tenantId: { in: tenantIds } },
        select: { userId: true, tenantId: true, role: true },
      })
    : [];

  const threatCount =
    companyIds.length > 0
      ? await prisma.threatEvent.count({ where: { tenantCompanyId: { in: companyIds } } })
      : 0;

  console.log("Tenants matched:");
  if (tenants.length === 0) console.log("  (none)");
  else tenants.forEach((t) => console.log(`  - ${t.slug} (${t.name}) [${t.id}]`));

  console.log("\nCompanies under matched tenants:");
  if (companies.length === 0) console.log("  (none)");
  else companies.forEach((c) => console.log(`  - ${c.name} [company ${c.id}] tenant ${c.tenantId}`));

  console.log(`\nUserRoleAssignment rows: ${roleRows.length}`);
  console.log(`ThreatEvent rows (prod plane): ${threatCount}`);

  if (!EXECUTE) {
    const allTenantIds = new Set(
      (await prisma.tenant.findMany({ select: { id: true } })).map((t) => t.id),
    );
    const allRoles = await prisma.userRoleAssignment.findMany({
      select: { id: true, tenantId: true, userId: true },
    });
    const dangling = allRoles.filter((r) => !allTenantIds.has(r.tenantId));
    if (dangling.length > 0) {
      console.log(`\nOrphan UserRoleAssignment (tenant row missing): ${dangling.length}`);
      dangling.forEach((r) =>
        console.log(`  - role ${r.id} user ${r.userId.slice(0, 8)}… tenant ${r.tenantId}`),
      );
    }
    console.log("\nDry-run complete. Re-run with --execute to delete.");
    return;
  }

  if (tenants.length === 0) {
    const orphanMeta = await deleteOrphanRolesForMatchedAuthUsers(terms);
    const orphanDangling = await deleteDanglingRoleAssignments();
    const orphanInvites = await deleteOrphanInvitationsBySlug(terms);
    if (orphanMeta.count > 0) {
      console.log(`\nOrphan role rows removed (auth tenant_slug match): ${orphanMeta.count}`);
    }
    if (orphanDangling.count > 0) {
      console.log(`Dangling UserRoleAssignment removed (missing tenant FK): ${orphanDangling.count}`);
    }
    if (orphanInvites.count > 0) {
      console.log(`Orphan workspace invitations removed: ${orphanInvites.count}`);
    }
    if (orphanMeta.count === 0 && orphanDangling.count === 0 && orphanInvites.count === 0) {
      console.log("\nNo tenants matched kim/dwoods; no dangling roles to remove.");
    } else {
      console.log("\n[OK] Orphan RBAC cleanup complete.");
    }
    return;
  }

  const authResult = await deleteSupabaseUsersForTenantRoles(tenantIds, terms);
  if (authResult.skipped) {
    console.warn(`\nSupabase auth purge skipped: ${authResult.reason}`);
  } else {
    console.log(`\nSupabase auth users deleted: ${authResult.deleted.length}/${authResult.candidateCount}`);
    if (authResult.errors.length > 0) {
      console.warn("Supabase delete errors:", authResult.errors);
    }
  }

  const threatResult = await deleteThreatPlaneForCompanies(companyIds);
  console.log(`ThreatEvent deleted: ${threatResult.threatEvents}`);

  const orphanCounts = await deleteTenantScopedOrphans(tenantIds, terms);
  console.log("Tenant-scoped orphan purge:", orphanCounts);

  const tenantDelete = await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
  console.log(`Tenants deleted (FK cascade to companies, RiskEvent, vendors, …): ${tenantDelete.count}`);

  const orphanDangling = await deleteDanglingRoleAssignments();
  if (orphanDangling.count > 0) {
    console.log(`Dangling UserRoleAssignment removed: ${orphanDangling.count}`);
  }

  console.log("\n[OK] Purge complete. Re-provision with /admin/onboarding or /register/setup.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
