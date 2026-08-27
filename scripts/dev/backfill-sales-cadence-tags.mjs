/**
 * Backfill `Cadence: TOUCHN` onto DISPATCHED sales rows written before
 * 2026-08-27, when the dispatch route rebuilt the summary and dropped the
 * pending draft's cadence line.
 *
 * Touch number is derived from chronological send order per contact — the same
 * count-based rule `app/lib/server/salesTouchHistoryCore.ts` uses at runtime.
 * Only the Trace Matrix gains a line; wire copy is never touched.
 *
 * Usage:
 *   npx tsx scripts/dev/backfill-sales-cadence-tags.mjs --dry
 *   npx tsx scripts/dev/backfill-sales-cadence-tags.mjs
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import {
  parseCadenceTouch,
  touchStageFromOrdinal,
  withCadenceTraceLine,
} from "../../app/lib/salesTouchCadence.ts";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const DISPATCHED = "[DISPATCHED SALES COURIER]";
const dry = process.argv.includes("--dry");

const prisma = new PrismaClient();

try {
  const rows = await prisma.ironboardCrmInteraction.findMany({
    where: { summary: { contains: DISPATCHED }, contactId: { not: null } },
    orderBy: { occurredAt: "asc" },
    select: { id: true, summary: true, occurredAt: true, contactId: true },
  });

  const ordinalByContact = new Map();
  const planned = [];
  let alreadyTagged = 0;
  let mismatched = 0;

  for (const row of rows) {
    const ordinal = (ordinalByContact.get(row.contactId) ?? 0) + 1;
    ordinalByContact.set(row.contactId, ordinal);
    const derived = touchStageFromOrdinal(ordinal);
    const existing = parseCadenceTouch(row.summary);

    if (existing) {
      alreadyTagged += 1;
      if (existing !== derived) {
        mismatched += 1;
        planned.push({
          id: row.id,
          contactId: row.contactId,
          sentAt: row.occurredAt.toISOString().slice(0, 10),
          ordinal,
          existing,
          derived,
          action: "conflict_left_alone",
        });
      }
      continue;
    }

    planned.push({
      id: row.id,
      contactId: row.contactId,
      sentAt: row.occurredAt.toISOString().slice(0, 10),
      ordinal,
      existing: null,
      derived,
      action: "tag",
    });
  }

  const toTag = planned.filter((p) => p.action === "tag");
  let written = 0;
  if (!dry) {
    for (const p of toTag) {
      const row = rows.find((r) => r.id === p.id);
      await prisma.ironboardCrmInteraction.update({
        where: { id: p.id },
        data: { summary: withCadenceTraceLine(row.summary, p.derived).slice(0, 12_000) },
      });
      written += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dry,
        dispatchedRows: rows.length,
        contacts: ordinalByContact.size,
        alreadyTagged,
        conflicts: mismatched,
        toTag: toTag.length,
        written,
        byTouch: toTag.reduce((acc, p) => {
          acc[p.derived] = (acc[p.derived] ?? 0) + 1;
          return acc;
        }, {}),
        sample: toTag.slice(0, 10),
        conflictRows: planned.filter((p) => p.action === "conflict_left_alone"),
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
