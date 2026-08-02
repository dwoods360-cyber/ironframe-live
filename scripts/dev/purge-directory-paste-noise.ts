/**
 * Purge MSSPProviders paste noise from directory-imported SUSPECTs.
 * Usage: npx tsx --env-file=.env scripts/dev/purge-directory-paste-noise.ts [--apply]
 */
import { PrismaClient } from "@prisma/client";

import { directoryPasteNoiseReason } from "../../app/lib/ironleadsDirectoryPasteNoise";

const APPLY = process.argv.includes("--apply");

function holdClass(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "active";
  const h = (metadata as Record<string, unknown>).operatorHold;
  if (!h || typeof h !== "object" || Array.isArray(h)) return "active";
  const rec = h as Record<string, unknown>;
  if (typeof rec.at !== "string" || !rec.at.trim()) return "active";
  return String(rec.classification || "hold").toLowerCase();
}

function isDirectoryImport(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const dir = (metadata as Record<string, unknown>).directoryImport;
  return Boolean(dir && typeof dir === "object");
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.ironboardCrmContact.findMany({
      where: { primaryDeals: { some: { stage: "SUSPECT" } } },
      select: {
        id: true,
        company: true,
        metadata: true,
        primaryDeals: {
          where: { stage: "SUSPECT" },
          select: { id: true },
        },
      },
      take: 5000,
    });

    const directoryRows = rows.filter((r) => isDirectoryImport(r.metadata));
    const toDelete: Array<{
      id: string;
      company: string;
      reason: string;
      dealIds: string[];
    }> = [];
    const keep: Array<{ id: string; company: string; bucket: string }> = [];

    for (const row of directoryRows) {
      const reason = directoryPasteNoiseReason(row.company);
      if (reason) {
        toDelete.push({
          id: row.id,
          company: row.company,
          reason,
          dealIds: row.primaryDeals.map((d) => d.id),
        });
      } else {
        keep.push({ id: row.id, company: row.company, bucket: holdClass(row.metadata) });
      }
    }

    const byName = new Map<string, typeof keep>();
    for (const row of keep) {
      const key = row.company.trim().toLowerCase();
      const list = byName.get(key) ?? [];
      list.push(row);
      byName.set(key, list);
    }

    const keepFinal: typeof keep = [];
    for (const [, list] of byName) {
      list.sort((a, b) => {
        if (a.bucket === "active" && b.bucket !== "active") return -1;
        if (b.bucket === "active" && a.bucket !== "active") return 1;
        return a.id.localeCompare(b.id);
      });
      keepFinal.push(list[0]!);
      for (const extra of list.slice(1)) {
        const full = directoryRows.find((r) => r.id === extra.id);
        toDelete.push({
          id: extra.id,
          company: extra.company,
          reason: "exact_name_dupe",
          dealIds: full?.primaryDeals.map((d) => d.id) ?? [],
        });
      }
    }

    const reasonCounts: Record<string, number> = {};
    for (const row of toDelete) {
      reasonCounts[row.reason] = (reasonCounts[row.reason] ?? 0) + 1;
    }

    console.log(
      JSON.stringify(
        {
          mode: APPLY ? "APPLY" : "DRY_RUN",
          directoryImportSuspects: directoryRows.length,
          willDelete: toDelete.length,
          willKeep: keepFinal.length,
          keepPending: keepFinal.filter((r) => r.bucket === "pending_batch").length,
          keepActive: keepFinal.filter((r) => r.bucket === "active").length,
          reasonCounts,
        },
        null,
        2,
      ),
    );

    if (APPLY) {
      const contactIds = toDelete.map((r) => r.id);
      const dealIds = [...new Set(toDelete.flatMap((r) => r.dealIds))];
      const chunk = <T,>(arr: T[], size: number) => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
      };
      for (const ids of chunk(dealIds, 80)) {
        if (!ids.length) continue;
        await prisma.ironboardCrmInteraction.deleteMany({ where: { dealId: { in: ids } } });
        await prisma.ironboardCrmDeal.deleteMany({ where: { id: { in: ids } } });
      }
      for (const ids of chunk(contactIds, 80)) {
        await prisma.ironboardCrmInteraction.deleteMany({ where: { contactId: { in: ids } } });
        await prisma.ironboardCrmContact.deleteMany({ where: { id: { in: ids } } });
      }
      console.log(
        JSON.stringify(
          { removedContacts: contactIds.length, kept: keepFinal.length },
          null,
          2,
        ),
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
