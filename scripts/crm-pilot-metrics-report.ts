/**
 * Ring-2 / PARTNER_REFERRAL pilot metrics report (full Gate B spec).
 *
 * Usage:
 *   npm run crm:pilot-report
 *   npm run crm:pilot-report -- --tenant-slug=blackwoodscoffee --weeks=4
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  PILOT_QUALITY_GATES,
  evaluateConsecutiveGateBPass,
  isoWeekKey,
  resolvePilotOperationalMode,
} from "../lib/crm/pilotGates";
import { buildPartnerWeeklyGateEvaluations } from "../Ironboard/src/services/crm/crmPilotTracking";

function loadEnv() {
  for (const name of [".env", ".env.local"]) {
    const envPath = resolve(process.cwd(), name);
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1]!.trim()] = match[2]!.trim().replace(/^["']|["']$/g, "");
    }
  }
}

loadEnv();

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  const out = { tenantSlug: null as string | null, weeks: 4 };
  for (const arg of argv) {
    if (arg.startsWith("--tenant-slug=")) out.tenantSlug = arg.split("=")[1] ?? null;
    if (arg.startsWith("--weeks=")) out.weeks = Number(arg.split("=")[1]) || 4;
  }
  return out;
}

async function checkGateA() {
  const cols = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'ironboard_crm_contacts' AND column_name = 'adjacent_sector'
  `;
  const enums = await prisma.$queryRaw<{ enumlabel: string }[]>`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'IronboardLeadIngestionSource'
  `;
  const labels = enums.map((row) => row.enumlabel);
  return {
    adjacentColumn: cols.length > 0,
    partnerReferralEnum: labels.includes("PARTNER_REFERRAL"),
    ready: cols.length > 0 && labels.includes("PARTNER_REFERRAL"),
  };
}

async function main() {
  const { tenantSlug, weeks } = parseArgs(process.argv.slice(2));
  console.log("=== CRM Ring-2 Pilot Metrics (Gate B full spec) ===\n");

  const gateA = await checkGateA();
  console.log("Gate A — System readiness");
  console.log(`  adjacent_sector column: ${gateA.adjacentColumn ? "YES" : "NO"}`);
  console.log(`  PARTNER_REFERRAL enum:  ${gateA.partnerReferralEnum ? "YES" : "NO"}`);
  console.log(`  READY: ${gateA.ready ? "YES" : "NO — run prisma migrate deploy"}\n`);

  const tenant = tenantSlug
    ? await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true, slug: true },
      })
    : null;

  const partnerContacts = await prisma.ironboardCrmContact.findMany({
    where: {
      ingestionSource: "PARTNER_REFERRAL",
      ...(tenant ? { tenantId: tenant.id } : {}),
    },
    select: {
      createdAt: true,
      priorityScore: true,
      industrySector: true,
      adjacentSector: true,
      detectedTrigger: true,
      qualificationSignals: true,
      metadata: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - weeks * 7);
  const windowContacts = partnerContacts.filter((c) => c.createdAt >= since);

  const weekKeys = [...new Set(windowContacts.map((c) => isoWeekKey(c.createdAt)))].sort();
  const weeklyEvals = buildPartnerWeeklyGateEvaluations(windowContacts, weekKeys);
  const { pass: gateBPass, consecutiveWeeks, evaluations } =
    evaluateConsecutiveGateBPass(weeklyEvals);

  const operationalMode = resolvePilotOperationalMode({
    gateAReady: gateA.ready,
    consecutiveGateBPass: gateBPass,
    totalPartnerLeads: partnerContacts.length,
  });

  console.log(
    tenant
      ? `Tenant: ${tenant.slug} | PARTNER_REFERRAL leads (last ${weeks} weeks): ${windowContacts.length}\n`
      : `All tenants | PARTNER_REFERRAL leads (last ${weeks} weeks): ${windowContacts.length}\n`,
  );

  if (weekKeys.length === 0) {
    console.log("No PARTNER_REFERRAL leads in window.");
    console.log(
      "  Create via CRM: ingestionSource=PARTNER_REFERRAL, adjacentSector=CREDIT_UNION, icpConfirmed on qualify.\n",
    );
  }

  for (const ev of evaluations) {
    console.log(`ISO week ${ev.weekKey} (ingested: ${ev.metrics.ingested})`);
    console.log(`  Q-confirmed rate:     ${ev.qualificationRatePct}% (need >= ${PILOT_QUALITY_GATES.minQualificationRatePct}%)`);
    console.log(`  Evidence avg:         ${ev.evidenceAvgPct}% (need >= ${PILOT_QUALITY_GATES.minEvidenceCompletenessPct}%)`);
    console.log(
      `  FA-rate (of Q-conf):  ${ev.firstActionRateOfQualifiedPct}% (need >= ${PILOT_QUALITY_GATES.minFirstActionRateOfQualifiedPct}%)`,
    );
    console.log(
      `  Median TTFA:          ${ev.medianFirstActionBusinessHours == null ? "n/a" : `${ev.medianFirstActionBusinessHours.toFixed(1)} business hours`} (need <= ${PILOT_QUALITY_GATES.maxMedianFirstActionBusinessHours})`,
    );
    console.log(`  Week pass:            ${ev.pass ? "YES" : "NO"}`);
    if (!ev.pass && ev.failures.length > 0) {
      for (const f of ev.failures) console.log(`    - ${f}`);
    }
    console.log("");
  }

  console.log("Gate B — Scale trigger (all 4 thresholds, 2 consecutive ISO weeks)");
  console.log(`  Consecutive passing weeks: ${consecutiveWeeks} / ${PILOT_QUALITY_GATES.consecutiveWeeksRequired}`);
  console.log(`  GATE B PASS: ${gateBPass ? "YES" : "NO — continue pilot"}\n`);

  console.log("Operational mode");
  console.log(`  ${operationalMode}`);
  console.log(
    operationalMode === "OPERATIONAL_SCALE"
      ? "  Ring-2 may drive agent outreach prioritization."
      : "  Ring-2 is sort-only in list_prioritized_leads until Gate B passes.",
  );

  console.log("\nQualification levels");
  console.log("  Q-proxy:     priorityScore >= 40");
  console.log("  Q-confirmed: Q-proxy + (icpConfirmed OR >= 3/4 evidence fields)");
  console.log("\nFirst action (FA): typed GRC artifact via log_interaction firstActionType");
  console.log("  VENDOR_ASSESSMENT | CONTROL_MAPPING | QUESTIONNAIRE | REMEDIATION");
  console.log("\nLogs: grep CRM_PILOT_METRIC in Ironboard server output");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
