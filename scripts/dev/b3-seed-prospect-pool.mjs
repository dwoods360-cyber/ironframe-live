/**
 * B3: enrich Ironleads SUSPECTs with publicly listed phones, seed a few
 * beachhead research accounts into prospect-pool, promote reachable → PROSPECT.
 *
 * Phones/emails must be from public company pages — no invented personal inboxes.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const env = { ...process.env, ...loadEnvLocal() };
const secret = (env.IRONLEADS_INGRESS_SECRET || "").trim();
const baseUrl = (
  env.IRONLEADS_INGRESS_BASE_URL ||
  "http://127.0.0.1:3000"
).replace(/\/+$/, "");
const prisma = new PrismaClient();

/**
 * Public sales/contact phones from company pages (verified 2026-07-19).
 * Prefer MSSP/vCISO beachhead — do not cold-SMS bank retail switchboards.
 */
const SEEDS = [
  {
    companyName: "Pivot Point Security",
    industrySector: "MSSP_ENCLAVE",
    detectedTrigger: "COMPLIANCE_JOB_POST",
    accountDomain: "pivotpointsecurity.com",
    contactName: "vCISO / GRC practice",
    phone: "+18774540039",
    contactEmail: null,
    phoneSource: "https://www.pivotpointsecurity.com/contact/ (877-454-0039)",
  },
  {
    companyName: "BlueRadius Cyber",
    industrySector: "MSSP_ENCLAVE",
    detectedTrigger: "COMPLIANCE_JOB_POST",
    accountDomain: "blueradius.io",
    contactName: "vCISO practice",
    phone: "+18009300989",
    contactEmail: "info@blueradius.io",
    phoneSource:
      "https://blueradius.io/ (800-930-0989 · info@blueradius.io public)",
  },
];

async function ingressLead(seed) {
  const payload = {
    companyName: seed.companyName,
    industrySector: seed.industrySector,
    detectedTrigger: seed.detectedTrigger,
    targetTenantSlug: "prospect-pool",
    contactName: seed.contactName,
    accountDomain: seed.accountDomain,
  };
  if (seed.contactEmail) payload.contactEmail = seed.contactEmail;

  const res = await fetch(`${baseUrl}/api/v1/ingress/ironleads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  if (!secret) {
    console.error("FAIL: IRONLEADS_INGRESS_SECRET missing");
    process.exit(2);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: "prospect-pool" },
    select: { id: true },
  });
  if (!tenant) {
    console.error("FAIL: prospect-pool tenant missing — run prisma seed");
    process.exit(2);
  }

  console.log("=== B3 seed prospect-pool ===");

  for (const seed of SEEDS) {
    const shipped = await ingressLead(seed);
    console.log(
      "ingress:",
      seed.companyName,
      shipped.status,
      JSON.stringify(shipped.body).slice(0, 200),
    );

    const contact = await prisma.ironboardCrmContact.findFirst({
      where: {
        tenantId: tenant.id,
        company: { equals: seed.companyName, mode: "insensitive" },
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!contact) {
      console.log("WARN: contact not found after ingress:", seed.companyName);
      continue;
    }

    await prisma.ironboardCrmContact.update({
      where: { id: contact.id },
      data: {
        phone: seed.phone,
        title: "OSINT suspect — public switchboard (enrich buyer before send)",
        metadata: {
          ...(typeof contact.metadata === "object" && contact.metadata
            ? contact.metadata
            : {}),
          b3PhoneSource: seed.phoneSource,
          b3EnrichedAt: new Date().toISOString(),
          b3Note:
            "Switchboard/public contact only — replace with named buyer before DISPATCH",
        },
      },
    });

    const deal = await prisma.ironboardCrmDeal.findFirst({
      where: {
        tenantId: tenant.id,
        primaryContactId: contact.id,
      },
      orderBy: { updatedAt: "desc" },
    });
    if (deal && deal.stage === "SUSPECT") {
      await prisma.ironboardCrmDeal.update({
        where: { id: deal.id },
        data: {
          stage: "PROSPECT",
          accountDomain: seed.accountDomain,
          notes: `${deal.notes}\nB3 ${new Date().toISOString()}: promoted SUSPECT→PROSPECT after public phone enrichment. ${seed.phoneSource}`,
        },
      });
      console.log("promoted PROSPECT:", seed.companyName, deal.id);
    } else if (deal) {
      await prisma.ironboardCrmDeal.update({
        where: { id: deal.id },
        data: { accountDomain: seed.accountDomain },
      });
      console.log("already staged:", seed.companyName, deal.stage);
    }
  }

  const prospects = await prisma.ironboardCrmDeal.findMany({
    where: { tenantId: tenant.id, stage: "PROSPECT" },
    include: {
      primaryContact: {
        select: { company: true, email: true, phone: true },
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        prospectCount: prospects.length,
        prospects: prospects.map((d) => ({
          dealId: d.id,
          company: d.primaryContact.company,
          phone: d.primaryContact.phone,
          email: d.primaryContact.email,
          domain: d.accountDomain,
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
