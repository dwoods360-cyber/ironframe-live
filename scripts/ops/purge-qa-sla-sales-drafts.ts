/**
 * Soft-purge PENDING SALES drafts left by production QA / SLA e2e public-lead submits.
 * Mirrors Approvals UI PURGE — does not send, does not hard-delete.
 *
 * Match (all must hold):
 *   - Summary contains [PENDING SALES DRAFT APPROVAL], not already purged
 *   - Company matches Ironframe SLA / QA / Central Test throwaway patterns
 * Optional: email @example.com or sla-/qa0- local-part strengthens match (already gated by company)
 *
 * Usage:
 *   npx tsx scripts/ops/purge-qa-sla-sales-drafts.ts
 *   npx tsx scripts/ops/purge-qa-sla-sales-drafts.ts --execute
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

const PENDING_TAG = "[PENDING SALES DRAFT APPROVAL]";

/** Real ICP / partner companies — never purge even if naming collides. */
const DENY_COMPANY =
  /\b(blueradius|pivot\s*point|western\s*alliance)\b/i;

/** QA / SLA throwaway org names from e2e + operator tests (optional [QA THROWAWAY] prefix). */
const THROWAY_COMPANY =
  /^(?:\[qa throwaway\]\s*)?ironframe\s+(sla(\s+ladder|\s+t[123])?|qa\d*(\s+t[123])?|central\s+test)\b/i;

function isThrowawayEmail(email: string | null | undefined): boolean {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return false;
  if (e.endsWith("@example.com")) return /^(sla[-.]|qa0|qa16|qa02)/i.test(e);
  return false;
}

function isThrowawayCompany(company: string | null | undefined): boolean {
  const c = (company ?? "").trim();
  if (!c) return false;
  if (DENY_COMPANY.test(c)) return false;
  return THROWAY_COMPANY.test(c);
}

function isThrowawayRow(company: string | null | undefined, email: string | null | undefined): boolean {
  if (DENY_COMPANY.test(company ?? "") || DENY_COMPANY.test(email ?? "")) return false;
  return isThrowawayCompany(company) || isThrowawayEmail(email);
}

async function main(): Promise<void> {
  const execute = process.argv.includes("--execute");

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is not set.");
  }

  const prisma = new PrismaClient();
  try {
    const rows = await prisma.ironboardCrmInteraction.findMany({
      where: {
        summary: { contains: PENDING_TAG },
        NOT: {
          OR: [
            { summary: { contains: "[PURGED]" } },
            { summary: { startsWith: "[PURGED DRAFT]" } },
          ],
        },
      },
      orderBy: { occurredAt: "desc" },
      select: {
        id: true,
        occurredAt: true,
        summary: true,
        contact: { select: { company: true, email: true } },
      },
    });

    const targets = rows.filter((r) =>
      isThrowawayRow(r.contact?.company, r.contact?.email),
    );
    const skipped = rows.length - targets.length;

    const preview = targets.map((r) => ({
      id: r.id,
      company: r.contact?.company ?? null,
      email: r.contact?.email ?? null,
      occurredAt: r.occurredAt.toISOString(),
    }));

    if (!execute) {
      console.log(
        JSON.stringify(
          {
            ok: true,
            mode: "DRY-RUN",
            pendingScanned: rows.length,
            wouldPurge: targets.length,
            skippedNonThrowaway: skipped,
            preview,
            note: "Re-run with --execute to soft-purge (Approvals PURGE rewrite).",
          },
          null,
          2,
        ),
      );
      return;
    }

    const purged: typeof preview = [];
    for (const row of targets) {
      const purgedSummary = [
        "[PURGED DRAFT] This automated strategy suggestion was discarded by an operator.",
        "--- Discarded Copy Text ---",
        row.summary,
      ].join("\n");

      await prisma.ironboardCrmInteraction.update({
        where: { id: row.id },
        data: {
          summary: purgedSummary.slice(0, 12_000),
          occurredAt: new Date(),
        },
      });
      purged.push({
        id: row.id,
        company: row.contact?.company ?? null,
        email: row.contact?.email ?? null,
        occurredAt: row.occurredAt.toISOString(),
      });
    }

    // Cancel open OpsActivities for matching inbound-lead QA slugs so SLA cron stops.
    const activities = await prisma.opsActivity.findMany({
      where: {
        sourceRef: { startsWith: "inbound-lead:ironframe-" },
        status: { in: ["PLANNED", "IN_PROGRESS"] },
      },
      select: { id: true, title: true, sourceRef: true, status: true, notes: true },
    });
    const activityTargets = activities.filter((a) => {
      const title = a.title ?? "";
      const ref = a.sourceRef ?? "";
      const orgFromTitle = title.replace(/^P1 Inbound ·\s*/i, "").split(" · ")[0] ?? "";
      return (
        /ironframe-(sla|qa|central-test)/i.test(ref) || THROWAY_COMPANY.test(orgFromTitle)
      );
    });

    let activitiesCancelled = 0;
    for (const a of activityTargets) {
      const nextNotes = `${(a.notes ?? "").trim()} · [QA_PURGE] ${new Date().toISOString()}`.trim();
      await prisma.opsActivity.update({
        where: { id: a.id },
        data: {
          status: "CANCELLED",
          notes: nextNotes.slice(0, 4_000),
        },
      });
      activitiesCancelled += 1;
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: "EXECUTE",
          purged: purged.length,
          activitiesCancelled,
          purgedRows: purged,
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
