/**
 * Deny purged auto Ironcast newsletter queue drafts and mark calendar DONE.
 * Usage: npx tsx scripts/resolve-auto-ironcast-newsletters.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FILES = [
  "2026-07-15-draft-auto-newsletter-tenant-sovereignty.md",
  "2026-07-16-draft-auto-newsletter-design-partner-cohort.md",
] as const;

const REASON =
  "DENIED FROM QUEUE — fluffed GTM/sales Ironcast tone. Substance rewritten as distinct product documentation; not Governance Frame institutional newsletters.";
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

    const cal = await prisma.opsActivity.findFirst({ where: { sourceRef: filename } });
    if (cal) {
      await prisma.opsActivity.update({
        where: { id: cal.id },
        data: {
          status: "DONE",
          completedAt: new Date(),
          notes:
            "DONE — DENIED FROM QUEUE. Auto Ironcast GTM draft removed; product substance lives in internal docs.",
        },
      });
      console.log("calendar marked DONE", filename, cal.id);
    }
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
