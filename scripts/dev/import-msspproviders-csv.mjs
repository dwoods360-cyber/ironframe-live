/**
 * Import collector CSV into prospect-pool SUSPECTs (standalone Prisma — no server-only).
 * Usage: node --env-file=.env scripts/dev/import-msspproviders-csv.mjs scripts/dev/out/msspproviders-websites.csv
 */
import { readFileSync } from "node:fs";
import { randomUUID as uuid } from "node:crypto";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ACTIVE_CAP = 20;
const file = resolve(process.argv[2] || "scripts/dev/out/msspproviders-websites.csv");

function parseCsv(raw) {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    if (/^company,website$/i.test(line.trim())) continue;
    const m = line.match(/^"?([^",]+)"?\s*,\s*"?(https?:\/\/[^"]*)"?\s*$/i);
    if (m) {
      rows.push({ company: m[1].trim(), website: m[2].trim() });
      continue;
    }
    const idx = line.indexOf(",http");
    if (idx > 0) {
      rows.push({
        company: line.slice(0, idx).replace(/^"|"$/g, "").trim(),
        website: line.slice(idx + 1).replace(/^"|"$/g, "").trim(),
      });
    }
  }
  return rows;
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function companyKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asRecord(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return { ...v };
}

async function main() {
  const rows = parseCsv(readFileSync(file, "utf8"));
  const tenant = await prisma.tenant.findUnique({
    where: { slug: "prospect-pool" },
    select: { id: true },
  });
  if (!tenant) throw new Error("prospect-pool tenant missing");

  const existing = await prisma.ironboardCrmContact.findMany({
    where: {
      tenantId: tenant.id,
      primaryDeals: { some: { stage: "SUSPECT" } },
    },
    select: {
      id: true,
      company: true,
      metadata: true,
      priorityScore: true,
      primaryDeals: {
        where: { stage: "SUSPECT" },
        take: 1,
        select: { id: true, accountDomain: true },
      },
    },
    take: 5000,
  });
  const byKey = new Map(existing.map((c) => [companyKey(c.company), c]));

  let created = 0;
  let updated = 0;
  const touchedIds = [];

  for (const row of rows) {
    const key = companyKey(row.company);
    if (!key) continue;
    const domain = domainFromUrl(row.website);
    const prior = byKey.get(key);
    const stamp = {
      websiteUrl: row.website,
      directoryImport: {
        source: "msspproviders_public",
        importedAt: new Date().toISOString(),
        notes: "Collector Visit Website URL",
      },
    };

    if (prior) {
      const meta = { ...asRecord(prior.metadata), ...stamp };
      // Keep existing hold unless clearing pending to refresh website — keep hold as-is
      await prisma.ironboardCrmContact.update({
        where: { id: prior.id },
        data: {
          metadata: meta,
          ingestionSource: "MANUAL_INPUT",
          title: "Suspect — free directory import",
          detectedTrigger: "COMPLIANCE_JOB_POST",
          industrySector: "MSSP_ENCLAVE",
        },
      });
      if (domain && prior.primaryDeals[0]?.id) {
        await prisma.ironboardCrmDeal.update({
          where: { id: prior.primaryDeals[0].id },
          data: { accountDomain: domain },
        });
      }
      updated += 1;
      touchedIds.push(prior.id);
    } else {
      const email = `suspect+${uuid().slice(0, 8)}@ironleads.local`;
      const contact = await prisma.ironboardCrmContact.create({
        data: {
          tenantId: tenant.id,
          fullName: "Ironleads Prospect",
          email,
          company: row.company,
          title: "Suspect — free directory import",
          industrySector: "MSSP_ENCLAVE",
          detectedTrigger: "COMPLIANCE_JOB_POST",
          ingestionSource: "MANUAL_INPUT",
          priorityScore: 55,
          metadata: stamp,
        },
      });
      await prisma.ironboardCrmDeal.create({
        data: {
          tenantId: tenant.id,
          title: `${row.company} — SUSPECT`,
          stage: "SUSPECT",
          primaryContactId: contact.id,
          accountDomain: domain,
          notes: `MSSPProviders collector import ${new Date().toISOString()}`,
        },
      });
      created += 1;
      touchedIds.push(contact.id);
      byKey.set(key, contact);
    }
  }

  // Re-park overflow: keep newest ACTIVE_CAP active among directory imports; pending_batch the rest
  const suspects = await prisma.ironboardCrmContact.findMany({
    where: {
      tenantId: tenant.id,
      primaryDeals: { some: { stage: "SUSPECT" } },
    },
    orderBy: [{ createdAt: "desc" }],
    select: { id: true, createdAt: true, metadata: true },
    take: 2000,
  });

  const directory = suspects.filter((c) => asRecord(c.metadata).directoryImport);
  const hold = {
    at: new Date().toISOString(),
    reason: "Pending pool — pull into active batch of 20 when ready.",
    source: "operator",
    classification: "pending_batch",
  };

  let parked = 0;
  let active = 0;
  for (let i = 0; i < directory.length; i++) {
    const row = directory[i];
    const meta = asRecord(row.metadata);
    const existingHold = asRecord(meta.operatorHold);
    const isCompetitor =
      existingHold.classification === "channel_competitor" ||
      existingHold.classification === "hold";
    if (isCompetitor && existingHold.at) continue;

    if (active < ACTIVE_CAP) {
      if (meta.operatorHold) {
        delete meta.operatorHold;
        await prisma.ironboardCrmContact.update({
          where: { id: row.id },
          data: { metadata: meta },
        });
      }
      active += 1;
    } else {
      meta.operatorHold = hold;
      await prisma.ironboardCrmContact.update({
        where: { id: row.id },
        data: { metadata: meta },
      });
      parked += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        file,
        rows: rows.length,
        created,
        updated,
        activeKept: active,
        parkedPending: parked,
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
