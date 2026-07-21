/**
 * Purge PENDING SALES DRAFT rows that fail content-quality gates
 * (prompt leaks / raw CRM triggers / GF sales signature / $0.00 ALE),
 * clear SalesTeam processedDeal for those deals, print deal IDs for re-poll.
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "dotenv";
import { PrismaClient as IronPrisma } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local"), override: true });
config({ path: resolve(process.cwd(), ".env"), override: false });

const PENDING_TAG = "[PENDING SALES DRAFT APPROVAL]";

function failsContentQuality(summary) {
  const body = summary || "";
  const lower = body.toLowerCase();
  if (lower.includes("anti-hallucination")) return "anti-hallucination";
  if (lower.includes("never invent portals")) return "never invent portals";
  if (lower.includes("ironframe governance frame")) return "gf sales signature";
  if (/\bCOMPLIANCE_JOB_POST\b/.test(body)) return "COMPLIANCE_JOB_POST";
  if (/\$0\.00/.test(body) && /loss exposure/i.test(body)) return "$0.00 loss exposure";
  if (/\bbigint\b/i.test(body) || /irongate dmz/i.test(body)) return "eng jargon dump";
  if (lower.includes("in this story, not us")) return "storybrand scaffold voice";
  if (lower.includes("wedge:")) return "wedge scaffold label";
  if (lower.includes("pending operator approval")) return "operator HITL footer in body";
  if (/\[cadence:/i.test(body)) return "cadence footer in body";
  // Ingress used to strip \\n — smashed bodies fail professionalism gate.
  const reply = body.split("--- Agent Proposed Reply Text ---")[1]?.split("--- Prospect Context ---")[0] || "";
  if (reply.length > 120 && !/\n\s*\n/.test(reply) && !reply.includes("\nHi ")) {
    return "smashed newlines / missing paragraph breaks";
  }
  return null;
}

const iron = new IronPrisma();
const salesClientPath = resolve(process.cwd(), "SalesTeam/generated/client/index.js");
const { PrismaClient: SalesPrisma } = await import(pathToFileURL(salesClientPath).href);
const salesDb = resolve(process.cwd(), "SalesTeam/data/salesteam.db").replace(/\\/g, "/");
const sales = new SalesPrisma({
  datasources: { db: { url: `file:${salesDb}` } },
});

try {
  const rows = await iron.ironboardCrmInteraction.findMany({
    where: {
      summary: { contains: PENDING_TAG },
      NOT: {
        OR: [
          { summary: { contains: "[PURGED]" } },
          { summary: { startsWith: "[PURGED DRAFT]" } },
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      dealId: true,
      contactId: true,
      summary: true,
      contact: { select: { company: true, email: true } },
    },
  });

  const toPurge = [];
  for (const row of rows) {
    const reason = failsContentQuality(row.summary);
    if (reason) toPurge.push({ row, reason });
  }

  const dealIds = new Set();
  const purged = [];

  for (const { row, reason } of toPurge) {
    const purgedSummary = [
      "[PURGED DRAFT] Content-quality fail — discarded by operator tooling (prompt leak / unfinished template).",
      `Reason: ${reason}`,
      "--- Discarded Copy Text ---",
      row.summary,
    ].join("\n");

    await iron.ironboardCrmInteraction.update({
      where: { id: row.id },
      data: {
        summary: purgedSummary.slice(0, 12_000),
        occurredAt: new Date(),
      },
    });
    if (row.dealId) dealIds.add(row.dealId);
    purged.push({
      id: row.id,
      company: row.contact?.company ?? null,
      dealId: row.dealId,
      reason,
    });
  }

  let clearedProcessed = 0;
  if (dealIds.size > 0) {
    const result = await sales.processedDeal.deleteMany({
      where: { ironframeDealId: { in: [...dealIds] } },
    });
    clearedProcessed = result.count;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        scannedPending: rows.length,
        purged: purged.length,
        clearedProcessedDeals: clearedProcessed,
        dealIdsForRepoll: [...dealIds],
        purgedRows: purged,
        next: "Restart SalesTeam (:8084) so it loads the fixed draftsman, then POST http://127.0.0.1:8084/poll",
      },
      null,
      2,
    ),
  );
} finally {
  await iron.$disconnect();
  await sales.$disconnect();
}
