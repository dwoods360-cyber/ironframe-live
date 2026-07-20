/**
 * Seed Kenneth A. Vecchione (Chairman / President / CEO) as executive sponsor context
 * on the Western Alliance SUSPECT. Does not change named buyer (McMaster) or clear email locks.
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient, type Prisma } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

const SOURCE_URLS = [
  "https://investors.westernalliancebancorporation.com/governance/board-of-directors/person-details/default.aspx?ItemId=aff4caba-2eb8-4c16-80fd-1f9c93ea514b",
  "https://www.businesswire.com/news/home/20260615498168/en/Western-Alliance-Appoints-CEO-Kenneth-Vecchione-as-Chairman",
  "https://www.westernalliancebancorporation.com/kenneth-a-vecchione",
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

  const priorEvidence =
    prior.triggerEvidence &&
    typeof prior.triggerEvidence === "object" &&
    !Array.isArray(prior.triggerEvidence)
      ? { ...(prior.triggerEvidence as Record<string, unknown>) }
      : {};

  const executiveSponsor = {
    fullName: "Kenneth A. Vecchione",
    title: "Chairman, President and Chief Executive Officer",
    roleSince: "2018-04-01",
    chairmanSince: "2026-06-10",
    sourceUrls: SOURCE_URLS,
    note:
      "Board/CEO context for BOARD_MANDATE_DOLLAR_RISK and CISO hire sponsorship — not the primary outreach contact. Primary named buyer remains Stephen McMaster (CISO). No personal email seeded (unverified).",
    seededAt: new Date().toISOString(),
  };

  const metadata: Record<string, unknown> = {
    ...prior,
    executiveSponsor,
    triggerEvidence: {
      ...priorEvidence,
      BOARD_MANDATE_DOLLAR_RISK: {
        person: "Kenneth A. Vecchione",
        role: "Chairman / President / CEO",
        chairmanSince: "2026-06-10",
        sources: SOURCE_URLS,
      },
    },
  };

  await prisma.ironboardCrmContact.update({
    where: { id: western.id },
    data: {
      detectedTrigger: "NEW_CISO,BOARD_MANDATE_DOLLAR_RISK,REG_FINE",
      metadata: metadata as Prisma.InputJsonValue,
    },
  });

  const deal = western.primaryDeals[0];
  if (deal) {
    await prisma.ironboardCrmDeal.update({
      where: { id: deal.id },
      data: {
        notes: [
          deal.notes?.trim() || "",
          `Executive sponsor seed ${new Date().toISOString()}: Kenneth A. Vecchione — Chairman (2026-06-10), President & CEO (since 2018-04-01).`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        contactId: western.id,
        namedBuyer: "Stephen McMaster (CISO) — unchanged",
        executiveSponsor: executiveSponsor.fullName,
        emailLock: "still PLACEHOLDER_EMAIL — no verified Vecchione/McMaster inbox",
        candidateGuessOnly: "kvecchione@westernalliancebank.com (pattern from PR media contacts; unverified)",
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
