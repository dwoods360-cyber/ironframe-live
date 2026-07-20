/**
 * Pre-outreach run order audit (R2 / partial R4 / R6 inventory).
 * Usage: npx tsx scripts/dev/pre-outreach-run-order-audit.ts
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const PENDING = "[PENDING SALES DRAFT APPROVAL]";
const prisma = new PrismaClient();

function lockCheck(text: string): string[] {
  const t = text || "";
  const fails: string[] = [];
  if (!/\$4,?999|4999/.test(t)) fails.push("missing_4999");
  if (!/workflow\s*review|15[-\s]?min|10[–-]15/i.test(t)) {
    fails.push("missing_workflow_review_cta");
  }
  if (/free\s*(poc|pilot|trial)/i.test(t)) fails.push("banned_free_pilot");
  if (/medshield|vaultbank|gridcore/i.test(t)) fails.push("banned_demo_slug");
  if (/request\s*demo/i.test(t) && !/not\s+a\s+demo/i.test(t)) {
    fails.push("request_demo_cta");
  }
  return fails;
}

async function main() {
  const rows = await prisma.ironboardCrmInteraction.findMany({
    where: {
      summary: { contains: PENDING },
      NOT: {
        OR: [
          { summary: { contains: "[PURGED]" } },
          { summary: { startsWith: "[PURGED DRAFT]" } },
        ],
      },
      contactId: { not: null },
    },
    orderBy: { occurredAt: "desc" },
    take: 40,
    select: {
      id: true,
      contactId: true,
      summary: true,
      occurredAt: true,
      contact: { select: { fullName: true, email: true, company: true, phone: true } },
    },
  });

  const byContact = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (!r.contactId) continue;
    if (!byContact.has(r.contactId)) byContact.set(r.contactId, r);
  }
  const newest = [...byContact.values()];

  const report = newest.map((r) => {
    const body = r.summary || "";
    const fails = lockCheck(body);
    const email = r.contact?.email || "";
    return {
      company: r.contact?.company || r.contact?.fullName,
      email,
      phone: r.contact?.phone || null,
      occurredAt: r.occurredAt.toISOString(),
      ironleadsLocal: /@ironleads\.local$/i.test(email),
      dispatchHint: /@ironleads\.local$/i.test(email) ? "SMS" : "EMAIL_or_SMS",
      lockFails: fails,
      pass: fails.length === 0,
    };
  });

  const opsOpen = await prisma.opsActivity.count({
    where: { status: { in: ["PLANNED", "IN_PROGRESS", "IN_REVIEW"] } },
  });
  const wfCards = await prisma.opsActivity.count({
    where: { sourceRef: { startsWith: "wf-recap:" } },
  });

  const prospects = await prisma.ironboardCrmDeal.count({
    where: { stage: "PROSPECT" },
  });
  const suspects = await prisma.ironboardCrmDeal.count({
    where: { stage: "SUSPECT" },
  });

  console.log(
    JSON.stringify(
      {
        pendingNewestPerContact: report.length,
        allMessageLocksPass: report.length > 0 && report.every((r) => r.pass),
        report,
        crm: { prospects, suspects },
        calendar: { opsOpenActivities: opsOpen, wfRecapCards: wfCards },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
