import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { lintSalesHumanVoice } from "../../app/lib/salesHumanVoice.ts";

config({ path: resolve(process.cwd(), ".env.local"), override: true });
const prisma = new PrismaClient();

const PENDING = "[PENDING SALES DRAFT APPROVAL]";
const rows = await prisma.ironboardCrmInteraction.findMany({
  where: {
    summary: { contains: PENDING },
    NOT: {
      OR: [
        { summary: { contains: "[PURGED DRAFT]" } },
        { summary: { contains: "[NEEDS ENRICHMENT]" } },
        { summary: { contains: "[HOLD PARKED DRAFT]" } },
      ],
    },
  },
  select: {
    id: true,
    summary: true,
    contact: { select: { fullName: true, company: true } },
  },
  take: 200,
});

let touch2 = 0;
let pass = 0;
let fail = 0;
const failures = [];

for (const row of rows) {
  const isT2 =
    /Cadence:\s*TOUCH2/i.test(row.summary) || /Touch 2 day/i.test(row.summary);
  if (isT2) touch2 += 1;
  const body =
    row.summary
      .split("--- Agent Proposed Reply Text ---")[1]
      ?.split("--- Prospect Context ---")[0]
      ?.trim() ?? "";
  const lint = lintSalesHumanVoice(body);
  if (lint.ok) pass += 1;
  else {
    fail += 1;
    if (failures.length < 12) {
      failures.push({
        company: row.contact?.company,
        buyer: row.contact?.fullName,
        touch2: isT2,
        issues: lint.issues.map((i) => i.code),
      });
    }
  }
}

console.log(
  JSON.stringify(
    { pending: rows.length, touch2, pass, fail, sampleFailures: failures },
    null,
    2,
  ),
);
await prisma.$disconnect();
