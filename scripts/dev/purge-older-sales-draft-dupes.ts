/**
 * Purge older duplicate PENDING SALES DRAFT rows (keep newest per contactId).
 * Mirrors Approvals PURGE summary rewrite — no outbound send.
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const PENDING_TAG = "[PENDING SALES DRAFT APPROVAL]";
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.ironboardCrmInteraction.findMany({
    where: {
      summary: { contains: PENDING_TAG },
      NOT: {
        OR: [
          { summary: { contains: "[PURGED]" } },
          { summary: { startsWith: "[PURGED DRAFT]" } },
        ],
      },
      contactId: { not: null },
    },
    orderBy: { occurredAt: "desc" },
    select: {
      id: true,
      contactId: true,
      occurredAt: true,
      summary: true,
      contact: { select: { company: true, email: true } },
    },
  });

  const newestByContact = new Set<string>();
  const toPurge: typeof rows = [];

  for (const row of rows) {
    const contactId = row.contactId!;
    if (!newestByContact.has(contactId)) {
      newestByContact.add(contactId);
      continue;
    }
    toPurge.push(row);
  }

  if (toPurge.length === 0) {
    console.log(JSON.stringify({ ok: true, purged: 0, kept: newestByContact.size, message: "No duplicates." }));
    return;
  }

  const purged: Array<{ id: string; company: string | null; occurredAt: Date }> = [];
  for (const row of toPurge) {
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
      occurredAt: row.occurredAt,
    });
  }

  const remainingRows = await prisma.ironboardCrmInteraction.findMany({
    where: {
      summary: { contains: PENDING_TAG },
      contactId: { not: null },
    },
    select: { summary: true },
  });
  const remaining = remainingRows.filter(
    (row) =>
      !row.summary.includes("[PURGED]") &&
      !row.summary.startsWith("[PURGED DRAFT]"),
  ).length;

  console.log(
    JSON.stringify(
      {
        ok: true,
        purged: purged.length,
        keptContacts: newestByContact.size,
        pendingSalesDraftsRemaining: remaining,
        purgedRows: purged,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
