/**
 * Preview NOBYPASSRLS cutover smoke.
 *
 * Run against a Supabase preview database whose DATABASE_URL is the
 * `ironframe_app` role (rolbypassrls = false) after
 * `prisma/scripts/tenant_rls_rollout.sql` steps 1–3.
 *
 *   npx tsx scripts/preview-rls-nobyypass-smoke.ts
 *
 * Optional env:
 *   RLS_SMOKE_TENANT_A / RLS_SMOKE_TENANT_B — two distinct tenant UUIDs with data
 *   PRIVILEGED_DATABASE_URL — must differ from DATABASE_URL role when set
 *
 * Does not rotate production credentials. Exit 0 = pass; non-zero = fail.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

type Check = { name: string; ok: boolean; detail: string };

function databaseRole(rawUrl: string): string {
  const role = decodeURIComponent(
    new URL(rawUrl.replace(/^postgres:\/\//, "postgresql://")).username,
  ).trim();
  if (!role) throw new Error("DATABASE_URL missing role");
  return role;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(2);
  }

  const role = databaseRole(databaseUrl);
  const tenantA =
    process.env.RLS_SMOKE_TENANT_A?.trim() ||
    process.env.SHADOW_PLANE_INGEST_TENANT_UUID?.trim() ||
    "";
  const tenantB = process.env.RLS_SMOKE_TENANT_B?.trim() || "";

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const checks: Check[] = [];

  try {
    const bypassRows = await prisma.$queryRaw<Array<{ rolbypassrls: boolean }>>`
      SELECT rolbypassrls FROM pg_roles where rolname = current_user
    `;
    const bypass = bypassRows[0]?.rolbypassrls === true;
    checks.push({
      name: "application role is NOBYPASSRLS",
      ok: !bypass,
      detail: `current_user=${role} rolbypassrls=${bypass}`,
    });

    const unboundAudit = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "AuditLog"
    `;
    const unboundThreat = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "ThreatEvent"
    `;
    const unboundCount =
      Number(unboundAudit[0]?.count ?? 0n) + Number(unboundThreat[0]?.count ?? 0n);
    checks.push({
      name: "unbound connection sees zero tenant ledger rows",
      ok: unboundCount === 0,
      detail: `AuditLog=${unboundAudit[0]?.count ?? 0} ThreatEvent=${unboundThreat[0]?.count ?? 0}`,
    });

    if (tenantA) {
      await prisma.$executeRaw`SELECT public.ironguard_set_session_tenant(${tenantA}::uuid)`;
      const boundA = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM "AuditLog"
        WHERE tenant_id::text = ${tenantA}
      `;
      const leakB = tenantB
        ? await prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*)::bigint AS count FROM "AuditLog"
            WHERE tenant_id::text = ${tenantB}
          `
        : [{ count: 0n }];
      checks.push({
        name: "bound tenant A can read only its AuditLog rows",
        ok: Number(leakB[0]?.count ?? 0n) === 0,
        detail: `tenantA_rows=${boundA[0]?.count ?? 0} tenantB_visible=${leakB[0]?.count ?? 0}`,
      });
    } else {
      checks.push({
        name: "bound tenant A can read only its AuditLog rows",
        ok: false,
        detail: "RLS_SMOKE_TENANT_A unset — bind check skipped/failed",
      });
    }

    const privilegedUrl = process.env.PRIVILEGED_DATABASE_URL?.trim();
    if (privilegedUrl) {
      const privilegedRole = databaseRole(privilegedUrl);
      checks.push({
        name: "privileged role differs from application role",
        ok: privilegedRole !== role,
        detail: `app=${role} privileged=${privilegedRole}`,
      });
    } else {
      checks.push({
        name: "privileged role differs from application role",
        ok: false,
        detail: "PRIVILEGED_DATABASE_URL unset — required before production cutover",
      });
    }

    const systemConfig = await prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: { id: true },
    });
    checks.push({
      name: "platform SystemConfig remains readable without tenant bind",
      ok: systemConfig?.id === "global",
      detail: systemConfig ? "global row visible" : "global row missing",
    });
  } finally {
    await prisma.$disconnect();
  }

  let failed = 0;
  for (const check of checks) {
    const mark = check.ok ? "PASS" : "FAIL";
    if (!check.ok) failed += 1;
    console.log(`[${mark}] ${check.name} — ${check.detail}`);
  }

  if (failed > 0) {
    console.error(`\nPreview NOBYPASSRLS smoke failed (${failed}/${checks.length}).`);
    process.exit(1);
  }
  console.log(`\nPreview NOBYPASSRLS smoke passed (${checks.length}/${checks.length}).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
