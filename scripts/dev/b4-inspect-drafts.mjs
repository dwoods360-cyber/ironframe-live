import { PrismaClient } from "@prisma/client";

const iron = new PrismaClient();
const TAG = "[PENDING SALES DRAFT APPROVAL]";

try {
  const tenant = await iron.tenant.findUnique({
    where: { slug: "prospect-pool" },
    select: { id: true },
  });
  const rows = await iron.ironboardCrmInteraction.findMany({
    where: {
      tenantId: tenant.id,
      summary: { contains: TAG },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      deal: { select: { id: true, title: true, stage: true } },
      contact: {
        select: { company: true, email: true, phone: true, fullName: true },
      },
    },
  });

  // Keep newest per dealId
  const newest = new Map();
  for (const row of rows) {
    if (!row.dealId) continue;
    if (!newest.has(row.dealId)) newest.set(row.dealId, row);
  }

  for (const row of newest.values()) {
    const body = row.summary;
    const checks = {
      pathB4999: /\$4,?999|4999/.test(body),
      workflowReview: /workflow review/i.test(body),
      noDemoSlug: !/\b(medshield|vaultbank|gridcore)\b/i.test(body),
      noFreePilot: !/free pilot/i.test(body),
      plannedGa: /planned\s+GA|~?\$?35,?000/i.test(body),
    };
    console.log("---");
    console.log(
      JSON.stringify(
        {
          interactionId: row.id,
          company: row.contact?.company,
          channel: row.channel,
          email: row.contact?.email,
          phone: row.contact?.phone,
          createdAt: row.createdAt,
          checks,
          preview: body.slice(0, 500),
        },
        null,
        2,
      ),
    );
  }

  console.log(
    JSON.stringify(
      {
        totalPendingInteractions: rows.length,
        uniqueDealsWithDraft: newest.size,
      },
      null,
      2,
    ),
  );
} finally {
  await iron.$disconnect();
}
