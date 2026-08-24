/**
 * Rewrite all pending Touch 1 Sales drafts to human peer voice.
 * Skips Touch 2. Touch 1 keeps no GA. PREP ONLY — no DISPATCH.
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { lintSalesHumanVoice } from "../../app/lib/salesHumanVoice.ts";
import { hasC1FounderEmailSignature } from "../../app/lib/salesC1FounderSignature.ts";
import { validateApprovalDispatch } from "../../app/lib/approvalDispatchValidation.ts";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const PENDING = "[PENDING SALES DRAFT APPROVAL]";
const SIG = ["Best,", "Dereck", "Founder, Ironframe", "dereck@ironframegrc.com"].join("\n");

function firstName(fullName) {
  const part = String(fullName || "").trim().split(/\s+/)[0] || "";
  if (!part || /^(ops|contact|info|admin|lead|unknown)$/i.test(part)) return "there";
  return part;
}

function extractOpen(body) {
  const lines = String(body || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim());
  // After Hi line, first non-empty paragraph
  let afterHi = false;
  const chunks = [];
  for (const line of lines) {
    if (/^Hi\b/i.test(line)) {
      afterHi = true;
      continue;
    }
    if (!afterHi) continue;
    if (!line) {
      if (chunks.length) break;
      continue;
    }
    chunks.push(line);
    break;
  }
  let open = chunks.join(" ").trim();
  open = open
    .replace(/\bstrictly\s+/gi, "")
    .replace(/\bstacks\b([^.]*?)\bstack\b/gi, "runs$1footprint")
    .replace(/\s+/g, " ")
    .trim();
  if (!open.endsWith("?") && !open.endsWith(".")) open = `${open}?`;
  return open;
}

function buildTouch1Body({ name, open }) {
  return [
    `Hi ${name},`,
    "",
    open,
    "",
    "Ironframe is built for that. Hard tenant walls. Residual risk in whole cents. Exportable evidence — so leadership sees dollar exposure, not another color chart.",
    "",
    "We're opening a small Design Partner group: $4,999 flat for a 90-day seat around 2–3 criteria you set.",
    "",
    "If that multi-client friction is real, the next step is a 10–15 minute workflow review on your evidence path — not a product tour.",
    "",
    SIG,
  ].join("\n");
}

function buildSummary({ subject, body, sector, lossLine }) {
  return [
    `${PENDING} ${subject}`,
    "--- Agent Proposed Reply Text ---",
    body,
    "--- Prospect Context ---",
    `Beachhead Sector: ${sector}`,
    lossLine,
    "HITL note: Human voice lock applied (spoken founder Touch 1). No GA on cold first touch. PREP ONLY — operator DISPATCH required.",
    "Cadence: TOUCH1",
    "Execution Source: salesTeamPoll | Channel:EMAIL",
  ].join("\n");
}

const prisma = new PrismaClient();

try {
  const rows = await prisma.ironboardCrmInteraction.findMany({
    where: {
      summary: { contains: PENDING },
      NOT: {
        OR: [
          { summary: { contains: "[PURGED DRAFT]" } },
          { summary: { contains: "[NEEDS ENRICHMENT]" } },
          { summary: { contains: "[HOLD PARKED DRAFT]" } },
        ],
      },
    },
    select: {
      id: true,
      summary: true,
      contact: { select: { fullName: true, company: true, email: true } },
    },
    take: 200,
  });

  const updated = [];
  const skipped = [];

  for (const row of rows) {
    const isT2 =
      /Cadence:\s*TOUCH2/i.test(row.summary) || /Touch 2 day/i.test(row.summary);
    if (isT2) {
      skipped.push({ id: row.id, reason: "touch2_keep", company: row.contact?.company });
      continue;
    }

    const subject =
      (row.summary.match(/\[PENDING SALES DRAFT APPROVAL\]\s*(.+)/) || [])[1]?.trim() ||
      `client-isolated evidence for ${row.contact?.company || "your"} accounts`;
    const priorBody =
      row.summary
        .split("--- Agent Proposed Reply Text ---")[1]
        ?.split("--- Prospect Context ---")[0]
        ?.trim() ?? "";
    const sector =
      (row.summary.match(/Beachhead Sector:\s*(.+)/i) || [])[1]?.trim() || "MSSP_ENCLAVE";
    const lossMatch = (row.summary.match(/Quantified loss exposure \(¢\):\s*(.+)/i) ||
      [])[1]?.trim();
    const lossLine =
      lossMatch && !/pending/i.test(lossMatch)
        ? `Quantified loss exposure (¢): ${lossMatch}`
        : "Quantified loss exposure (¢): pending operator baseline bind";

    let open = extractOpen(priorBody);
    if (!open || open.length < 40) {
      const company = row.contact?.company || "your team";
      open = `When ${company} runs compliance across client environments, how do you keep each client's evidence and board reporting isolated today — without shared-stack register risk?`;
    }

    const name = firstName(row.contact?.fullName);
    const body = buildTouch1Body({ name, open });
    const voice = lintSalesHumanVoice(body);
    const gate = validateApprovalDispatch({
      draftKind: "SALES",
      channel: "EMAIL",
      body,
      recipientEmail: row.contact?.email || "buyer@example.com",
      recipientPhone: null,
      company: row.contact?.company,
      acknowledgeOperatorSelfDispatch: true,
    });

    if (!voice.ok || !gate.ok || !hasC1FounderEmailSignature(body)) {
      updated.push({
        id: row.id,
        company: row.contact?.company,
        ok: false,
        voiceIssues: voice.issues,
        gateErrors: gate.ok ? [] : gate.errors,
      });
      continue;
    }

    const summary = buildSummary({ subject, body, sector, lossLine });
    await prisma.ironboardCrmInteraction.update({
      where: { id: row.id },
      data: { summary: summary.slice(0, 12_000), occurredAt: new Date() },
    });

    updated.push({
      id: row.id,
      company: row.contact?.company,
      buyer: row.contact?.fullName,
      ok: true,
      subject: subject.slice(0, 70),
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        rewritten: updated.filter((u) => u.ok).length,
        failed: updated.filter((u) => !u.ok),
        skipped,
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
