/**
 * Backfill website URL + brick-and-mortar address on SUSPECT contacts when known.
 * Writes contact.metadata.websiteUrl / metadata.address and deal.accountDomain when missing.
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient, type Prisma } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

type Enrichment = {
  companyMatch: RegExp;
  websiteUrl: string;
  accountDomain?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  addressSource?: string;
};

/** Public OSINT / investor-relations facts only — skip title-noise rows. */
const ENRICHMENTS: Enrichment[] = [
  {
    companyMatch: /^western alliance bancorporation$/i,
    websiteUrl: "https://www.westernalliancebancorporation.com",
    accountDomain: "westernalliancebancorporation.com",
    address: {
      street: "1 East Washington Street, Suite 1400",
      city: "Phoenix",
      state: "AZ",
      zip: "85004",
      country: "United States",
    },
    addressSource: "FFIEC NIC / company contact page",
  },
  {
    companyMatch: /^u\.?s\.?\s+department of health/i,
    websiteUrl: "https://www.hhs.gov",
    accountDomain: "hhs.gov",
  },
  {
    companyMatch: /^bod 26-04/i,
    websiteUrl: "https://msrc.microsoft.com",
    accountDomain: "msrc.microsoft.com",
  },
];

async function main() {
  const suspects = await prisma.ironboardCrmContact.findMany({
    where: { primaryDeals: { some: { stage: "SUSPECT" } } },
    select: {
      id: true,
      company: true,
      metadata: true,
      primaryDeals: {
        where: { stage: "SUSPECT" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { id: true, accountDomain: true },
      },
    },
  });

  const updated: Array<{ company: string; websiteUrl: string; address: boolean }> = [];

  for (const contact of suspects) {
    const enrichment = ENRICHMENTS.find((row) => row.companyMatch.test(contact.company));
    if (!enrichment) continue;

    const prior =
      contact.metadata && typeof contact.metadata === "object" && !Array.isArray(contact.metadata)
        ? { ...(contact.metadata as Record<string, unknown>) }
        : {};

    const metadata: Record<string, unknown> = {
      ...prior,
      websiteUrl: enrichment.websiteUrl,
    };
    if (enrichment.address) {
      metadata.address = enrichment.address;
      metadata.addressSource = enrichment.addressSource ?? "public company listing";
      metadata.addressEnrichedAt = new Date().toISOString();
    }

    await prisma.ironboardCrmContact.update({
      where: { id: contact.id },
      data: { metadata: metadata as Prisma.InputJsonValue },
    });

    const deal = contact.primaryDeals[0];
    if (deal && enrichment.accountDomain && !deal.accountDomain) {
      await prisma.ironboardCrmDeal.update({
        where: { id: deal.id },
        data: { accountDomain: enrichment.accountDomain },
      });
    }

    updated.push({
      company: contact.company,
      websiteUrl: enrichment.websiteUrl,
      address: Boolean(enrichment.address),
    });
  }

  console.log(JSON.stringify({ ok: true, updatedCount: updated.length, updated }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
