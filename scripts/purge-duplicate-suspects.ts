/**
 * One-shot: remove clone SUSPECT contacts (same tenant + company).
 * Usage: npx tsx scripts/purge-duplicate-suspects.ts
 */
import { PrismaClient } from "@prisma/client";

function normalizeCompanyKey(company: string): string {
  return company.trim().toLowerCase().replace(/\s+/g, " ");
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const suspects = await prisma.ironboardCrmContact.findMany({
      where: { primaryDeals: { some: { stage: "SUSPECT" } } },
      select: {
        id: true,
        tenantId: true,
        company: true,
        priorityScore: true,
        updatedAt: true,
        primaryDeals: {
          where: { stage: "SUSPECT" },
          select: { id: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const groups = new Map<string, typeof suspects>();
    for (const row of suspects) {
      const key = `${row.tenantId}::${normalizeCompanyKey(row.company)}`;
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }

    let removedContacts = 0;
    let keptGroups = 0;

    for (const [, group] of groups) {
      if (group.length === 0) continue;
      keptGroups += 1;
      if (group.length === 1) continue;

      const ranked = [...group].sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      });
      const [, ...dupes] = ranked;

      for (const dupe of dupes) {
        const dealIds = dupe.primaryDeals.map((d) => d.id);
        if (dealIds.length) {
          await prisma.ironboardCrmInteraction.deleteMany({
            where: { dealId: { in: dealIds } },
          });
          await prisma.ironboardCrmDeal.deleteMany({
            where: { id: { in: dealIds } },
          });
        }
        await prisma.ironboardCrmInteraction.deleteMany({
          where: { contactId: dupe.id },
        });
        await prisma.ironboardCrmContact.delete({ where: { id: dupe.id } });
        removedContacts += 1;
      }
    }

    console.log(JSON.stringify({ keptGroups, removedContacts, totalBefore: suspects.length }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
