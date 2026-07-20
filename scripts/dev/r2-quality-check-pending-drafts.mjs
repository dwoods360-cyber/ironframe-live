import { PrismaClient } from "@prisma/client";
import { validateOutboundContentQuality } from "../../SalesTeam/src/agents/outboundDraftsman.ts";

const iron = new PrismaClient();
const TAG = "[PENDING SALES DRAFT APPROVAL]";

try {
  const rows = await iron.ironboardCrmInteraction.findMany({
    where: {
      summary: { contains: TAG },
      NOT: {
        OR: [
          { summary: { contains: "[PURGED]" } },
          { summary: { startsWith: "[PURGED DRAFT]" } },
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: {
      contact: { select: { company: true, email: true, phone: true } },
    },
  });

  for (const row of rows) {
    const replyBlock = (row.summary.split("--- Agent Proposed Reply Text ---")[1] || row.summary).trim();
    // Quality-check customer copy only (strip operator prospect-context footer).
    const body = replyBlock.split("--- Prospect Context ---")[0].trim();
    const q = validateOutboundContentQuality(body);
    const locks = {
      pathB4999: /\$4,?999|4999/.test(body),
      workflowReview: /workflow review/i.test(body),
      noDemoSlug: !/\b(medshield|vaultbank|gridcore)\b/i.test(body),
      noFreePilot: !/free pilot|free poc|free trial/i.test(body),
    };
    console.log("====", row.contact?.company, row.id);
    console.log(
      JSON.stringify(
        {
          channel: row.channel,
          email: row.contact?.email,
          phone: row.contact?.phone,
          locks,
          contentQualityOk: q.ok,
          contentQualityViolations: q.violations,
          dispatchHint: String(row.contact?.email || "").endsWith("@ironleads.local")
            ? "SMS only (fake inbox)"
            : "EMAIL or SMS OK",
        },
        null,
        2,
      ),
    );
    console.log(body);
    console.log("");
  }
} finally {
  await iron.$disconnect();
}
