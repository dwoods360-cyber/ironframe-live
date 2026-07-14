import "server-only";

import { normalizeSuspectCompanyKey } from "@/app/lib/ingress/ironleadsSuspectIdentity";
import prisma from "@/lib/prisma";

export type SuspectDisplayRow = {
  id: string;
  company: string;
  priorityScore: number;
  detectedTrigger: string | null;
  createdAt: string | Date;
};

/** Collapse SUSPECT list rows to one entry per company (case/whitespace insensitive). */
export function collapseSuspectRowsByCompany<T extends SuspectDisplayRow>(rows: T[]): T[] {
  const best = new Map<string, T>();
  for (const row of rows) {
    const key = normalizeSuspectCompanyKey(row.company);
    if (!key) continue;
    const prev = best.get(key);
    if (!prev) {
      best.set(key, row);
      continue;
    }
    const prevAt = new Date(prev.createdAt).getTime();
    const rowAt = new Date(row.createdAt).getTime();
    if (
      row.priorityScore > prev.priorityScore ||
      (row.priorityScore === prev.priorityScore && rowAt > prevAt)
    ) {
      best.set(key, row);
    }
  }
  return [...best.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Remove clone SUSPECT contacts (same tenant + company key), keeping the highest-scoring /
 * newest contact and its deal. Duplicate harvests historically stacked clones despite ingress
 * dedupe races.
 */
export async function purgeDuplicateSuspectContacts(): Promise<{
  keptGroups: number;
  removedContacts: number;
}> {
  const suspects = await prisma.ironboardCrmContact.findMany({
    where: { primaryDeals: { some: { stage: "SUSPECT" } } },
    select: {
      id: true,
      tenantId: true,
      company: true,
      priorityScore: true,
      updatedAt: true,
      createdAt: true,
      primaryDeals: {
        where: { stage: "SUSPECT" },
        select: { id: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const groups = new Map<string, typeof suspects>();
  for (const row of suspects) {
    const key = `${row.tenantId}::${normalizeSuspectCompanyKey(row.company)}`;
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

  return { keptGroups, removedContacts };
}
