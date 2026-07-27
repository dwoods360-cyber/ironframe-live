/**
 * Operator-owned design-partner readiness steps (no live prospect DISPATCH, no counsel flip).
 *
 * - Purge stale BlueRadius PENDING dry-run Approvals draft(s)
 * - Restore CRM contact email to public info@blueradius.io
 * - Report AppDocument partner-packet presence
 *
 * Usage:
 *   npx vercel env run -e production -- npx tsx scripts/ops/design-partner-operator-ready-pass.ts
 *   npx vercel env run -e production -- npx tsx scripts/ops/design-partner-operator-ready-pass.ts --execute
 */
import { resolve } from "node:path";

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

const DEAL_ID = "edc5aa79-a9cb-4080-b646-d0118e59b392";
const CONTACT_ID = "b80331b5-c981-41b1-af8e-6e21dee046ea";
const LIVE_EMAIL = "info@blueradius.io";
const PENDING_TAG = "[PENDING SALES DRAFT APPROVAL]";
const PURGED_PREFIX =
  "[PURGED DRAFT] Dry-run complete — discarded by operator tooling (no live DISPATCH). --- Discarded Copy Text ---";

const PARTNER_PACKET_SLUGS = [
  "user-manuals/design-partner-operator-packet",
  "training/level1-partner-index",
];

async function main(): Promise<void> {
  const execute = process.argv.includes("--execute");
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is not set");
  }

  const prisma = new PrismaClient();
  try {
    const contact = await prisma.ironboardCrmContact.findUnique({
      where: { id: CONTACT_ID },
      select: { id: true, company: true, email: true, phone: true },
    });

    const pending = await prisma.ironboardCrmInteraction.findMany({
      where: {
        dealId: DEAL_ID,
        summary: { contains: PENDING_TAG },
      },
      select: { id: true, occurredAt: true, summary: true },
      orderBy: { occurredAt: "desc" },
    });

    // Exclude already-purged rows that still contain the PENDING tag in discarded copy.
    const pendingLive = pending.filter(
      (row) =>
        !row.summary.includes("[PURGED DRAFT]") &&
        !row.summary.startsWith("[PURGED DRAFT]"),
    );

    const appDocs = await prisma.appDocument.findMany({
      where: { slug: { in: PARTNER_PACKET_SLUGS } },
      select: { slug: true, title: true, updatedAt: true },
    });

    const plan = {
      ok: true,
      mode: execute ? "EXECUTE" : "DRY-RUN",
      contact,
      emailRestore: {
        from: contact?.email ?? null,
        to: LIVE_EMAIL,
        needed: Boolean(contact && contact.email.trim().toLowerCase() !== LIVE_EMAIL),
      },
      pendingDraftsToPurge: pendingLive.map((p) => ({
        id: p.id,
        occurredAt: p.occurredAt,
        preview: p.summary.slice(0, 120).replace(/\s+/g, " "),
      })),
      partnerPacketDocs: {
        expected: PARTNER_PACKET_SLUGS,
        found: appDocs,
        missing: PARTNER_PACKET_SLUGS.filter((s) => !appDocs.some((d) => d.slug === s)),
      },
    };
    console.log(JSON.stringify(plan, null, 2));

    if (!execute) {
      console.log("\nDry-run complete. Re-run with --execute to apply purge + email restore.");
      return;
    }

    const applied: Record<string, unknown> = {};

    if (plan.emailRestore.needed && contact) {
      await prisma.ironboardCrmContact.update({
        where: { id: contact.id },
        data: { email: LIVE_EMAIL },
      });
      applied.emailRestored = LIVE_EMAIL;
    } else {
      applied.emailRestored = "unchanged";
    }

    const purgedIds: string[] = [];
    for (const row of pendingLive) {
      const purgedSummary = `${PURGED_PREFIX}\n${row.summary}`.slice(0, 12_000);
      await prisma.ironboardCrmInteraction.update({
        where: { id: row.id },
        data: { summary: purgedSummary },
      });
      purgedIds.push(row.id);
    }
    applied.purgedDraftIds = purgedIds;

    console.log(JSON.stringify({ ok: true, applied }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
