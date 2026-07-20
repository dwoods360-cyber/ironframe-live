/**
 * Seed Stephen McMaster (CISO, Jan 2026) onto Western Alliance SUSPECT.
 * Retires the OSINT title-noise "Chief Information Security" row from the same fixture.
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient, type Prisma } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

const SOURCE_URLS = [
  "https://www.businesswire.com/news/home/20260121262396/en/Western-Alliance-Appoints-Stephen-McMaster-as-Chief-Information-Security-Officer",
  "https://investors.westernalliancebancorporation.com/News-and-Presentations/news/news-details/2026/Western-Alliance-Appoints-Stephen-McMaster-as-Chief-Information-Security-Officer/default.aspx",
  "https://www.westernalliancebancorporation.com/news/western-alliance-appoints-stephen-mcmaster-chief-information-security",
  "https://www.westernalliancebancorporation.com/insights/western-alliance-bank-cyber-security",
];

async function main() {
  const western = await prisma.ironboardCrmContact.findFirst({
    where: {
      company: { equals: "Western Alliance Bancorporation", mode: "insensitive" },
      primaryDeals: { some: { stage: "SUSPECT" } },
    },
    include: {
      primaryDeals: {
        where: { stage: "SUSPECT" },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!western) {
    console.error("Western Alliance SUSPECT not found");
    process.exit(2);
  }

  const prior =
    western.metadata && typeof western.metadata === "object" && !Array.isArray(western.metadata)
      ? { ...(western.metadata as Record<string, unknown>) }
      : {};

  const namedBuyer = {
    fullName: "Stephen McMaster",
    title: "Chief Information Security Officer",
    location: "Phoenix, AZ (HQ) · LinkedIn lists Chandler, AZ",
    trigger: "NEW_CISO",
    announcedAt: "2026-01-21",
    sourceUrls: SOURCE_URLS,
    note:
      "Public appointment: leads enterprise information security strategy, cyber risk management, regulatory compliance; reports into CAO per bank cyber program page. Prior: 20+ years Wells Fargo (cloud security / DLP / third-party cyber). No personal email published — use HQ switchboard for SMS or obtain buyer email before EMAIL DISPATCH.",
    seededAt: new Date().toISOString(),
  };

  const metadata: Record<string, unknown> = {
    ...prior,
    namedBuyer,
    triggerEvidence: {
      NEW_CISO: {
        person: "Stephen McMaster",
        announcedAt: "2026-01-21",
        sources: SOURCE_URLS,
      },
    },
  };

  await prisma.ironboardCrmContact.update({
    where: { id: western.id },
    data: {
      fullName: "Stephen McMaster",
      title: "Chief Information Security Officer",
      detectedTrigger: "NEW_CISO,REG_FINE,BOARD_MANDATE_DOLLAR_RISK",
      metadata: metadata as Prisma.InputJsonValue,
    },
  });

  const deal = western.primaryDeals[0];
  if (deal) {
    await prisma.ironboardCrmDeal.update({
      where: { id: deal.id },
      data: {
        title: "Western Alliance Bancorporation — CISO Stephen McMaster (NEW_CISO)",
        notes: [
          deal.notes?.trim() || "",
          `Named buyer seed ${new Date().toISOString()}: Stephen McMaster appointed CISO 2026-01-21 (Business Wire / IR).`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    });
  }

  const noise = await prisma.ironboardCrmContact.findMany({
    where: {
      company: { equals: "Chief Information Security", mode: "insensitive" },
      primaryDeals: { some: { stage: "SUSPECT" } },
    },
    include: {
      primaryDeals: { where: { stage: "SUSPECT" }, select: { id: true, notes: true } },
    },
  });

  let noiseClosed = 0;
  for (const row of noise) {
    for (const d of row.primaryDeals) {
      await prisma.ironboardCrmDeal.update({
        where: { id: d.id },
        data: {
          stage: "CLOSED_LOST",
          notes: [
            d.notes?.trim() || "",
            `Closed ${new Date().toISOString()}: OSINT title-noise parse of CISO phrase; superseded by Western Alliance + Stephen McMaster named-buyer enrichment.`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      });
      noiseClosed += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        westernContactId: western.id,
        namedBuyer: namedBuyer.fullName,
        noiseDealsClosed: noiseClosed,
        remainingLocks: [
          "PLACEHOLDER_EMAIL (no public CISO inbox)",
          "STAGE_SUSPECT (not yet promoted)",
          "NOT_PROSPECT_POOL (still on vaultbank)",
        ],
        cleared: ["named buyer attached", "NEW_CISO confirmed", "Chief Information Security noise retired"],
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
