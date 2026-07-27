/**
 * Quarantine a QA throwaway tenant without deleting platform-admin auth users.
 *
 * - Prefix display name with [QA THROWAWAY]
 * - Force billing PENDING (never ACTIVE)
 * - Remove role assignments for that tenant only
 * - Revoke ACTIVE workspace invitations for the slug
 * - Does NOT delete Supabase auth.users (safe for GLOBAL_ADMIN linked during QA)
 *
 * Usage:
 *   npx vercel env run -e production -- npx tsx scripts/ops/quarantine-qa-throwaway-tenant.ts --slug ironframe-central-test
 *   npx vercel env run -e production -- npx tsx scripts/ops/quarantine-qa-throwaway-tenant.ts --slug ironframe-central-test --execute
 */
import { resolve } from "node:path";

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

// Prefer already-injected env (e.g. `vercel env run -e production`); do not override.
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

const THROWAWAY_PREFIX = "[QA THROWAWAY]";

function readArg(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1]?.trim() || null;
}

async function main(): Promise<void> {
  const slug = (readArg("--slug") ?? "ironframe-central-test").trim().toLowerCase();
  const execute = process.argv.includes("--execute");

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is not set.");
  }

  const prisma = new PrismaClient();
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true },
    });

    if (!tenant) {
      console.log(JSON.stringify({ ok: true, found: false, slug }, null, 2));
      return;
    }

    const billing = await prisma.tenantBilling.findUnique({
      where: { tenantSlug: slug },
      select: { status: true, stripeCustomerId: true },
    });
    const roles = await prisma.userRoleAssignment.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, userId: true, role: true },
    });
    const activeInvites = await prisma.tenantWorkspaceInvitation.findMany({
      where: { tenantSlug: slug, status: "ACTIVE" },
      select: { id: true, email: true, status: true },
    });

    const nextName = tenant.name.startsWith(THROWAWAY_PREFIX)
      ? tenant.name
      : `${THROWAWAY_PREFIX} ${tenant.name}`.trim();

    const plan = {
      ok: true,
      mode: execute ? "EXECUTE" : "DRY-RUN",
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name, nextName },
      billing: billing ?? null,
      rolesToRemove: roles.length,
      invitesToRevoke: activeInvites.length,
      note: "Auth users are not deleted. Role rows for this tenant only are removed.",
    };
    console.log(JSON.stringify(plan, null, 2));

    if (!execute) {
      console.log("\nDry-run complete. Re-run with --execute to apply.");
      return;
    }

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { name: nextName },
    });

    if (billing) {
      if (billing.status !== "PENDING") {
        await prisma.tenantBilling.update({
          where: { tenantSlug: slug },
          data: { status: "PENDING" },
        });
      }
    } else {
      await prisma.tenantBilling.create({
        data: {
          tenantSlug: slug,
          stripeCustomerId: `manual_pending_${slug}`,
          status: "PENDING",
        },
      });
    }

    const roleDelete = await prisma.userRoleAssignment.deleteMany({
      where: { tenantId: tenant.id },
    });

    const inviteRevoke = await prisma.tenantWorkspaceInvitation.updateMany({
      where: { tenantSlug: slug, status: "ACTIVE" },
      data: { status: "REVOKED" },
    });

    // Revoke any open AGREED handoffs still pointing at this slug (OpsActivity baton).
    const openHandoffs = await prisma.opsActivity.findMany({
      where: {
        kind: "OPS_GENERAL",
        status: { in: ["PLANNED", "IN_PROGRESS"] },
        sourceRef: { startsWith: "order-form-agreed:" },
      },
      take: 40,
    });
    let handoffsRevoked = 0;
    for (const row of openHandoffs) {
      let payload: { workspaceSlug?: string; revokedAt?: string | null; consumedAt?: string | null } | null =
        null;
      try {
        payload = row.outcome ? (JSON.parse(row.outcome) as typeof payload) : null;
      } catch {
        payload = null;
      }
      if (!payload || payload.workspaceSlug !== slug || payload.revokedAt || payload.consumedAt) {
        continue;
      }
      await prisma.opsActivity.update({
        where: { id: row.id },
        data: {
          status: "CANCELLED",
          completedAt: new Date(),
          outcome: JSON.stringify({
            ...payload,
            revokedAt: new Date().toISOString(),
            revokeReason: "QA throwaway tenant quarantined",
          }),
        },
      });
      handoffsRevoked += 1;
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          applied: {
            renamedTo: nextName,
            billingStatus: "PENDING",
            rolesRemoved: roleDelete.count,
            invitesRevoked: inviteRevoke.count,
            handoffsRevoked,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
