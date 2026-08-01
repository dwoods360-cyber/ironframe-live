import "server-only";

import {
  normalizeAccountDomain,
  normalizeSuspectCompanyKey,
} from "@/app/lib/ingress/ironleadsSuspectIdentity";
import prisma from "@/lib/prisma";

export type SuspectDisplayRow = {
  id: string;
  company: string;
  priorityScore: number;
  detectedTrigger: string | null;
  createdAt: string | Date;
  /** Optional — when set, same domain collapses with company-key peers. */
  accountDomain?: string | null;
  primaryDeals?: Array<{ accountDomain?: string | null }>;
};

function rowAccountDomain(row: SuspectDisplayRow): string | null {
  return normalizeAccountDomain(
    row.accountDomain ?? row.primaryDeals?.[0]?.accountDomain ?? null,
  );
}

function preferSuspectRow<T extends SuspectDisplayRow>(a: T, b: T): T {
  if (b.priorityScore !== a.priorityScore) {
    return b.priorityScore > a.priorityScore ? b : a;
  }
  const aAt = new Date(a.createdAt).getTime();
  const bAt = new Date(b.createdAt).getTime();
  return bAt > aAt ? b : a;
}

/** Collapse SUSPECT list rows to one entry per company key (and domain when present). */
export function collapseSuspectRowsByCompany<T extends SuspectDisplayRow>(rows: T[]): T[] {
  if (rows.length === 0) return [];

  const parent = new Map<string, string>();
  for (const row of rows) parent.set(row.id, row.id);

  const byCompany = new Map<string, string[]>();
  const byDomain = new Map<string, string[]>();
  for (const row of rows) {
    const ck = normalizeSuspectCompanyKey(row.company);
    if (ck) {
      const list = byCompany.get(ck) ?? [];
      list.push(row.id);
      byCompany.set(ck, list);
    }
    const domain = rowAccountDomain(row);
    if (domain) {
      const list = byDomain.get(domain) ?? [];
      list.push(row.id);
      byDomain.set(domain, list);
    }
  }
  for (const ids of byCompany.values()) {
    for (let i = 1; i < ids.length; i++) union(parent, ids[0]!, ids[i]!);
  }
  for (const ids of byDomain.values()) {
    for (let i = 1; i < ids.length; i++) union(parent, ids[0]!, ids[i]!);
  }

  const best = new Map<string, T>();
  for (const row of rows) {
    const root = findRoot(parent, row.id);
    const prev = best.get(root);
    best.set(root, prev ? preferSuspectRow(prev, row) : row);
  }

  return [...best.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function findRoot(parent: Map<string, string>, id: string): string {
  let cur = id;
  while (parent.get(cur) !== cur) {
    const p = parent.get(cur)!;
    parent.set(cur, parent.get(p) ?? p);
    cur = parent.get(cur)!;
  }
  return cur;
}

function union(parent: Map<string, string>, a: string, b: string): void {
  const ra = findRoot(parent, a);
  const rb = findRoot(parent, b);
  if (ra !== rb) parent.set(rb, ra);
}

/**
 * Remove clone SUSPECT contacts (same tenant + company key and/or account domain),
 * keeping the highest-scoring / newest contact and its deal.
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
        select: { id: true, accountDomain: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const byTenant = new Map<string, typeof suspects>();
  for (const row of suspects) {
    const list = byTenant.get(row.tenantId) ?? [];
    list.push(row);
    byTenant.set(row.tenantId, list);
  }

  let removedContacts = 0;
  let keptGroups = 0;

  for (const [, tenantRows] of byTenant) {
    const parent = new Map<string, string>();
    for (const row of tenantRows) parent.set(row.id, row.id);

    const byCompany = new Map<string, string[]>();
    const byDomain = new Map<string, string[]>();
    for (const row of tenantRows) {
      const ck = normalizeSuspectCompanyKey(row.company);
      if (ck) {
        const list = byCompany.get(ck) ?? [];
        list.push(row.id);
        byCompany.set(ck, list);
      }
      for (const deal of row.primaryDeals) {
        const domain = normalizeAccountDomain(deal.accountDomain);
        if (!domain) continue;
        const list = byDomain.get(domain) ?? [];
        list.push(row.id);
        byDomain.set(domain, list);
      }
    }

    for (const ids of byCompany.values()) {
      for (let i = 1; i < ids.length; i++) union(parent, ids[0]!, ids[i]!);
    }
    for (const ids of byDomain.values()) {
      for (let i = 1; i < ids.length; i++) union(parent, ids[0]!, ids[i]!);
    }

    const groups = new Map<string, typeof tenantRows>();
    for (const row of tenantRows) {
      const root = findRoot(parent, row.id);
      const list = groups.get(root) ?? [];
      list.push(row);
      groups.set(root, list);
    }

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
  }

  return { keptGroups, removedContacts };
}
