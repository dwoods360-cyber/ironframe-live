/**
 * Force-refresh all live PENDING SALES DRAFT bodies to C1-locked copy.
 * Avoids server-only imports — inlines C1 template + summary envelope.
 *
 * Usage: node scripts/dev/_refresh-c1-sales-drafts.mjs
 * Dry-run: node scripts/dev/_refresh-c1-sales-drafts.mjs --dry
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local"), override: true });
config({ path: resolve(process.cwd(), ".env"), override: false });

const PENDING_TAG = "[PENDING SALES DRAFT APPROVAL]";
const PATH_B_USD = 4999;
const WINDOW_DAYS = 90;
const GA_USD = 35000;

const dry = process.argv.includes("--dry");

function formatUsd(n) {
  return n.toLocaleString("en-US");
}

function greetingName(fullName) {
  const part = String(fullName || "")
    .trim()
    .split(/\s+/)[0] || "";
  if (!part || /^(ops|contact|info|admin|lead|unknown)$/i.test(part)) return "Team";
  return part;
}

function buildEmail(prospect) {
  const name = greetingName(prospect.fullName);
  const subject = `Multi-client GRC walls — ${prospect.company}`;
  const body = [
    `Hi ${name},`,
    "",
    `When ${prospect.company} runs compliance across client environments, how do you keep evidence and board reporting isolated today — without mixing registers in a shared GRC stack?`,
    "",
    "Ironframe is built for that: hard tenant walls, residual risk in whole cents, and exportable evidence — so leadership sees dollar exposure, not another color chart.",
    "",
    `We're opening a small Command Design Partner cohort: $${formatUsd(PATH_B_USD)} flat for a ${WINDOW_DAYS}-day co-builder seat around 2–3 success criteria you set. Planned GA for Ironframe Command is ~$${formatUsd(GA_USD)}/year.`,
    "",
    "If that multi-client friction is real, the next step is a 10–15 minute workflow review on your evidence path — not a product tour.",
    "",
    "Best,",
    "Dereck",
    "Founder, Ironframe",
  ].join("\n");
  return { subject, body };
}

function buildSms(prospect) {
  const name = greetingName(prospect.fullName);
  const body = `Hi ${name}, Dereck @ Ironframe. MSSP seats: client walls + dollar risk, not shared heatmaps. 10–15 min workflow review? Reply YES or STOP.`;
  return { subject: `SMS · ${prospect.company}`, body };
}

function isSmsDraft(summary, channel) {
  if (String(channel || "").toUpperCase() === "SMS") return true;
  return /Execution Source:.*SMS/i.test(summary || "") || /^SMS ·/m.test(summary || "");
}

function buildSummary({ subject, body, channel, industrySector, lossExposureCents }) {
  const lossLine = lossExposureCents
    ? `Quantified loss exposure (¢): ${lossExposureCents}`
    : "Quantified loss exposure (¢): pending operator baseline bind";
  return [
    `${PENDING_TAG} ${subject}`,
    "--- Agent Proposed Reply Text ---",
    body,
    "--- Prospect Context ---",
    `Beachhead Sector: ${industrySector}`,
    lossLine,
    `Execution Source: SalesTeam/${channel}`,
  ].join("\n");
}

const prisma = new PrismaClient();

try {
  const rows = await prisma.ironboardCrmInteraction.findMany({
    where: {
      summary: { contains: PENDING_TAG },
      NOT: {
        OR: [
          { summary: { contains: "[PURGED DRAFT]" } },
          { summary: { startsWith: "[PURGED DRAFT]" } },
          { summary: { contains: "[NEEDS ENRICHMENT]" } },
          { summary: { startsWith: "[NEEDS ENRICHMENT]" } },
          { summary: { contains: "[HOLD PARKED DRAFT]" } },
          { summary: { startsWith: "[HOLD PARKED DRAFT]" } },
        ],
      },
      contactId: { not: null },
    },
    orderBy: { occurredAt: "desc" },
    select: {
      id: true,
      channel: true,
      summary: true,
      contact: {
        select: { fullName: true, company: true, email: true },
      },
    },
  });

  let refreshed = 0;
  let skipped = 0;
  const samples = [];

  for (const row of rows) {
    if (!row.contact) {
      skipped += 1;
      continue;
    }
    const prospect = {
      company: row.contact.company,
      fullName: row.contact.fullName,
    };
    const useSms = isSmsDraft(row.summary, row.channel);
    const draft = useSms ? buildSms(prospect) : buildEmail(prospect);

    const sectorMatch = row.summary.match(/Beachhead Sector:\s*(.+)/i);
    const lossMatch = row.summary.match(/Quantified loss exposure \(¢\):\s*(.+)/i);
    const industrySector = (sectorMatch?.[1] ?? "MSSP_ENCLAVE").trim();
    const lossRaw = (lossMatch?.[1] ?? "").trim();
    const lossExposureCents =
      lossRaw && !/pending/i.test(lossRaw) ? lossRaw : undefined;

    const summary = buildSummary({
      subject: draft.subject,
      body: draft.body,
      channel: useSms ? "SMS" : "EMAIL",
      industrySector,
      lossExposureCents,
    });

    if (samples.length < 3) {
      samples.push({
        company: prospect.company,
        channel: useSms ? "SMS" : "EMAIL",
        subject: draft.subject,
        opener: draft.body.split("\n")[2]?.slice(0, 90),
      });
    }

    if (!dry) {
      await prisma.ironboardCrmInteraction.update({
        where: { id: row.id },
        data: { summary: summary.slice(0, 12_000), occurredAt: new Date() },
      });
    }
    refreshed += 1;
  }

  console.log(
    JSON.stringify({ dry, pendingSeen: rows.length, refreshed, skipped, samples }, null, 2),
  );
} finally {
  await prisma.$disconnect();
}
