/**
 * Record Postgres denials for removed Market GRC Parts 1–3 queue mirrors
 * and mark calendar cleanup DONE.
 *
 * Usage: npx tsx scripts/resolve-market-grc-queue-mirrors.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FILES = [
  "2026-01-15-draft-market-grc-2000-2008.md",
  "2026-02-12-draft-market-grc-2009-2018.md",
  "2026-03-12-draft-market-grc-2019-today.md",
] as const;

const REASON =
  "DENIED/REMOVED — duplicate queue mirrors. Canonical CF-GRC Parts 1–3 locked in published ledger.";
const OPERATOR = "cursor-agent-resolution";

async function main() {
  for (const filename of FILES) {
    await prisma.$executeRaw`
      INSERT INTO "briefing_queue_denials" ("filename", "reason", "denied_by", "created_at")
      VALUES (${filename}, ${REASON}, ${OPERATOR}, CURRENT_TIMESTAMP)
      ON CONFLICT ("filename") DO UPDATE SET
        "denied_by" = EXCLUDED."denied_by",
        "reason" = EXCLUDED."reason"
    `;
    console.log("denial recorded", filename);
  }

  const cal = await prisma.opsActivity.findFirst({
    where: { sourceRef: "queue/archive-cf-grc-mirrors" },
  });
  if (cal) {
    await prisma.opsActivity.update({
      where: { id: cal.id },
      data: {
        status: "DONE",
        completedAt: new Date(),
        notes:
          "DONE — Market GRC Parts 1–3 queue mirrors DENIED/REMOVED as duplicates. Canonical CF-GRC Parts 1–3 remain locked in the published ledger (2026-07-16).",
      },
    });
    console.log("calendar marked DONE", cal.id);
  } else {
    console.log("calendar row absent — Seed all projects will create it as DONE");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
