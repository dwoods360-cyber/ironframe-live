/**
 * One-shot: purge clone SUSPECT contacts (company-key + domain).
 * Usage: node --env-file=.env.local scripts/dev/purge-ironleads-suspect-dups.mjs
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

async function main() {
  // Prefer compiled/tsx path via dynamic import of the TS module through next's alias — use prisma directly.
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  const PARENT_BRAND_PREFIX =
    /^(cbiz|kpmg|deloitte|pwc|ey|ernst\s*&\s*young|bdo|rsm|grant\s+thornton)\s+/i;
  const LEGAL_SUFFIX = /\s+(inc\.?|llc\.?|ltd\.?|l\.?l\.?c\.?|corp\.?|corporation|co\.)$/i;

  function normalizeSuspectCompanyKey(company) {
    let key = company.trim().toLowerCase().replace(/\s+/g, " ");
    key = key.replace(PARENT_BRAND_PREFIX, "");
    key = key.replace(LEGAL_SUFFIX, "");
    return key.trim();
  }

  function normalizeAccountDomain(domain) {
    if (!domain?.trim()) return null;
    const host = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      ?.replace(/^www\./, "");
    return host || null;
  }

  function findRoot(parent, id) {
    let cur = id;
    while (parent.get(cur) !== cur) {
      const p = parent.get(cur);
      parent.set(cur, parent.get(p) ?? p);
      cur = parent.get(cur);
    }
    return cur;
  }

  function union(parent, a, b) {
    const ra = findRoot(parent, a);
    const rb = findRoot(parent, b);
    if (ra !== rb) parent.set(rb, ra);
  }

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
        select: { id: true, accountDomain: true },
      },
    },
  });

  const byTenant = new Map();
  for (const row of suspects) {
    const list = byTenant.get(row.tenantId) ?? [];
    list.push(row);
    byTenant.set(row.tenantId, list);
  }

  let removed = 0;
  const removedDetail = [];

  for (const [, tenantRows] of byTenant) {
    const parent = new Map();
    for (const row of tenantRows) parent.set(row.id, row.id);

    const byCompany = new Map();
    const byDomain = new Map();
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
      for (let i = 1; i < ids.length; i++) union(parent, ids[0], ids[i]);
    }
    for (const ids of byDomain.values()) {
      for (let i = 1; i < ids.length; i++) union(parent, ids[0], ids[i]);
    }

    const groups = new Map();
    for (const row of tenantRows) {
      const root = findRoot(parent, row.id);
      const list = groups.get(root) ?? [];
      list.push(row);
      groups.set(root, list);
    }

    for (const [, group] of groups) {
      if (group.length < 2) continue;
      const ranked = [...group].sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      });
      const [keeper, ...dupes] = ranked;
      for (const dupe of dupes) {
        const dealIds = dupe.primaryDeals.map((d) => d.id);
        if (dealIds.length) {
          await prisma.ironboardCrmInteraction.deleteMany({
            where: { dealId: { in: dealIds } },
          });
          await prisma.ironboardCrmDeal.deleteMany({ where: { id: { in: dealIds } } });
        }
        await prisma.ironboardCrmInteraction.deleteMany({
          where: { contactId: dupe.id },
        });
        await prisma.ironboardCrmContact.delete({ where: { id: dupe.id } });
        removed += 1;
        removedDetail.push({
          removedId: dupe.id,
          removedCompany: dupe.company,
          keptId: keeper.id,
          keptCompany: keeper.company,
        });
      }
    }
  }

  console.log(JSON.stringify({ removed, removedDetail }, null, 2));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
