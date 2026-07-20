/**
 * Record denial for purged Medshield demo-tenant queue draft and mark calendar DONE.
 * Usage: npx tsx scripts/resolve-medshield-queue-draft.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const FILENAME = "2026-07-18-draft-medshield.md";
const REASON =
  "DENIED/PURGED — raw multi-tenant demo customer configuration text (Medshield seed). Dropped to preserve strict tenant isolation bounds.";
const OPERATOR = "cursor-agent-resolution";

async function main() {
  await prisma.$executeRaw`
    INSERT INTO "briefing_queue_denials" ("filename", "reason", "denied_by", "created_at")
    VALUES (${FILENAME}, ${REASON}, ${OPERATOR}, CURRENT_TIMESTAMP)
    ON CONFLICT ("filename") DO UPDATE SET
      "denied_by" = EXCLUDED."denied_by",
      "reason" = EXCLUDED."reason"
  `;
  console.log("denial recorded", FILENAME);

  const cal = await prisma.opsActivity.findFirst({
    where: { sourceRef: FILENAME },
  });
  if (cal) {
    await prisma.opsActivity.update({
      where: { id: cal.id },
      data: {
        status: "DONE",
        completedAt: new Date(),
        notes:
          "DONE — DENIED/PURGED. Raw Medshield demo-tenant narrate output removed; never a GF public briefing.",
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
