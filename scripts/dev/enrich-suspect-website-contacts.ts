/**
 * Seed public website contact (phone/email) onto SUSPECT CRM rows and clear
 * channel locks (placeholder email / missing phone) when the company site publishes them.
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient, type Prisma } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

type WebsiteContactSeed = {
  companyMatch: RegExp;
  websiteUrl: string;
  contactPageUrl: string;
  phone?: string;
  email?: string;
  accountDomain?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  note: string;
};

function toE164Us(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  throw new Error(`Unsupported phone: ${raw}`);
}

const SEEDS: WebsiteContactSeed[] = [
  {
    companyMatch: /^western alliance bancorporation$/i,
    websiteUrl: "https://www.westernalliancebancorporation.com",
    contactPageUrl: "https://www.westernalliancebancorporation.com/contact-us",
    phone: "(602) 389-3500",
    accountDomain: "westernalliancebancorporation.com",
    address: {
      street: "1 East Washington Street, Suite 1400",
      city: "Phoenix",
      state: "AZ",
      zip: "85004",
      country: "United States",
    },
    note: "HQ switchboard from corporate Contact Us page; business CS also lists (888) 995-2265.",
  },
  {
    companyMatch: /^u\.?s\.?\s+department of health/i,
    websiteUrl: "https://www.hhs.gov",
    contactPageUrl: "https://www.hhs.gov/ocr/about-us/contact-us/index.html",
    phone: "(800) 368-1019",
    email: "OCRMail@hhs.gov",
    accountDomain: "hhs.gov",
    address: {
      street: "200 Independence Avenue, SW, Room 509F, HHH Building",
      city: "Washington",
      state: "DC",
      zip: "20201",
      country: "United States",
    },
    note: "HHS OCR Customer Response Center — public regulator contact, not a design-partner buyer.",
  },
];

async function main() {
  const suspects = await prisma.ironboardCrmContact.findMany({
    where: { primaryDeals: { some: { stage: "SUSPECT" } } },
    select: {
      id: true,
      company: true,
      email: true,
      phone: true,
      metadata: true,
      primaryDeals: {
        where: { stage: "SUSPECT" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { id: true, accountDomain: true },
      },
    },
  });

  const results: Array<{
    company: string;
    phone: string | null;
    email: string | null;
    locksCleared: string[];
  }> = [];

  for (const contact of suspects) {
    const seed = SEEDS.find((row) => row.companyMatch.test(contact.company));
    if (!seed) {
      results.push({
        company: contact.company,
        phone: contact.phone,
        email: contact.email,
        locksCleared: [],
      });
      continue;
    }

    const prior =
      contact.metadata && typeof contact.metadata === "object" && !Array.isArray(contact.metadata)
        ? { ...(contact.metadata as Record<string, unknown>) }
        : {};

    const phoneE164 = seed.phone ? toE164Us(seed.phone) : null;
    const email = seed.email?.trim().toLowerCase() ?? null;
    const locksCleared: string[] = [];

    const nextPhone = phoneE164 ?? contact.phone;
    const nextEmail =
      email && (/@ironleads\.local$/i.test(contact.email) || !contact.email)
        ? email
        : contact.email;

    if (phoneE164 && !contact.phone?.trim()) locksCleared.push("NO_PHONE");
    if (email && /@ironleads\.local$/i.test(contact.email)) {
      locksCleared.push("PLACEHOLDER_EMAIL");
    }
    if (seed.accountDomain && !contact.primaryDeals[0]?.accountDomain) {
      locksCleared.push("MISSING_DOMAIN");
    }

    const metadata: Record<string, unknown> = {
      ...prior,
      websiteUrl: seed.websiteUrl,
      websiteContact: {
        phone: phoneE164,
        email,
        contactPageUrl: seed.contactPageUrl,
        note: seed.note,
        seededAt: new Date().toISOString(),
      },
      contactSource: "company_website",
    };
    if (seed.address) {
      metadata.address = seed.address;
      metadata.addressSource = seed.contactPageUrl;
      metadata.addressEnrichedAt = new Date().toISOString();
    }

    await prisma.ironboardCrmContact.update({
      where: { id: contact.id },
      data: {
        phone: nextPhone,
        email: nextEmail,
        metadata: metadata as Prisma.InputJsonValue,
        title: "Suspect — website contact enriched",
      },
    });

    const deal = contact.primaryDeals[0];
    if (deal) {
      const existing = await prisma.ironboardCrmDeal.findUnique({
        where: { id: deal.id },
        select: { notes: true, accountDomain: true },
      });
      await prisma.ironboardCrmDeal.update({
        where: { id: deal.id },
        data: {
          accountDomain: seed.accountDomain ?? existing?.accountDomain ?? null,
          notes: [
            existing?.notes?.trim() || "",
            `Website contact seed ${new Date().toISOString()}: ${seed.note}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      });
    }

    results.push({
      company: contact.company,
      phone: nextPhone,
      email: nextEmail,
      locksCleared,
    });
  }

  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
