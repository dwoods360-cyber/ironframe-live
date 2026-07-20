import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

async function main() {
  const text = "Dry-run: verify Path B order form follow-up after workflow review";
  const hash = createHash("sha256").update(text.toLowerCase()).digest("hex").slice(0, 12);
  const sourceRef = `wf-recap:dry-run:${hash}`;
  const existing = await prisma.opsActivity.findFirst({
    where: { sourceRef, kind: "OPS_GENERAL" },
  });
  const dueAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
  const data = {
    title: `[WF review] Dry-run: ${text}`.slice(0, 180),
    dueAt,
    notes: "Automated pre-outreach R6 smoke. Safe to mark done.",
    status: "PLANNED" as const,
    ownerLabel: "Sales",
  };
  const row = existing
    ? await prisma.opsActivity.update({ where: { id: existing.id }, data })
    : await prisma.opsActivity.create({
        data: {
          ...data,
          kind: "OPS_GENERAL",
          sourceRef,
          remindersSent: {},
        },
      });
  console.log(JSON.stringify({ id: row.id, sourceRef, created: !existing }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
