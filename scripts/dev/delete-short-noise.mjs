import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const bad = await prisma.ironboardCrmContact.findMany({
  where: {
    company: { in: ["VC3", "CTS"] },
    primaryDeals: { some: { stage: "SUSPECT" } },
  },
  select: {
    id: true,
    company: true,
    primaryDeals: { where: { stage: "SUSPECT" }, select: { id: true } },
  },
});

for (const row of bad) {
  const dealIds = row.primaryDeals.map((d) => d.id);
  if (dealIds.length) {
    await prisma.ironboardCrmInteraction.deleteMany({ where: { dealId: { in: dealIds } } });
    await prisma.ironboardCrmDeal.deleteMany({ where: { id: { in: dealIds } } });
  }
  await prisma.ironboardCrmInteraction.deleteMany({ where: { contactId: row.id } });
  await prisma.ironboardCrmContact.delete({ where: { id: row.id } });
  console.log("deleted", row.company);
}

// Pull 2 from pending_batch (oldest first)
const rows = await prisma.ironboardCrmContact.findMany({
  where: { primaryDeals: { some: { stage: "SUSPECT" } } },
  orderBy: { createdAt: "asc" },
  select: { id: true, metadata: true, createdAt: true },
  take: 2000,
});

function isPending(meta) {
  const h = meta && typeof meta === "object" ? meta.operatorHold : null;
  return Boolean(h && h.classification === "pending_batch" && h.at);
}

const pending = rows.filter((r) => isPending(r.metadata)).slice(0, 2);
for (const row of pending) {
  const meta = { ...(row.metadata || {}) };
  delete meta.operatorHold;
  await prisma.ironboardCrmContact.update({
    where: { id: row.id },
    data: { metadata: meta },
  });
  console.log("pulled", row.id);
}

await prisma.$disconnect();
