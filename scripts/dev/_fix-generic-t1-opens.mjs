/**
 * Fix generic Touch 1 opens with researched hooks + re-apply human voice body.
 * Also soft-refresh Assura/Appalachia CTAs (gerund "packs is" is correct English).
 * PREP ONLY.
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { lintSalesHumanVoice } from "../../app/lib/salesHumanVoice.ts";
import { validateApprovalDispatch } from "../../app/lib/approvalDispatchValidation.ts";
import { hasC1FounderEmailSignature } from "../../app/lib/salesC1FounderSignature.ts";
import { updatePendingSalesDraftOnly } from "../../app/lib/salesDraftWriteGuard.ts";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const PENDING = "[PENDING SALES DRAFT APPROVAL]";
const SIG = ["Best,", "Dereck", "Founder, Ironframe", "dereck@ironframegrc.com"].join("\n");

const FIXES = [
  {
    id: "0c291cc8-7202-4426-a13d-338857246197",
    label: "Wysetek",
    subject: "client-isolated evidence across Wysetek Cyber Defense Centre accounts",
    open:
      "As Wysetek runs MDR and SOCaaS from your Cyber Defense Centre across client environments, how do you keep each client's evidence registers and board reporting isolated today — without shared-stack register risk?",
  },
  {
    id: "2ae0f3d4-633e-481f-82b1-cdb177475076",
    label: "NonaSec",
    subject: "client-isolated evidence packs across NonaSec vCISO accounts",
    open:
      "When NonaSec runs vCISO and multi-framework compliance advisory across SMB client retainers, how do you keep each client's evidence packs and board reporting isolated today — without shared-stack register risk?",
  },
  {
    id: "50452a85-d213-4db6-89f5-efd46d88eec6",
    label: "OC Security Audit",
    subject: "client-isolated evidence for OC Security Audit SOC 2 readiness accounts",
    open:
      "When OC Security Audit runs SOC 2 readiness and vCISO advisory across Orange County client environments, how do you keep each client's evidence packs isolated today — without shared-stack register risk?",
  },
  {
    id: "50503c51-3b2e-4ce8-ac1d-c3f6f9ec8aae",
    label: "Xantrion",
    subject: "client-isolated evidence across Xantrion managed IT / MSSP accounts",
    open:
      "As Xantrion runs managed IT and turnkey cybersecurity with 24/7 incident detection across client environments, how do you keep each client's evidence registers and board reporting isolated today — without shared-stack register risk?",
  },
  {
    id: "5b708dee-2898-43f1-9766-cadf1dec2721",
    label: "OSIbeyond",
    subject: "client-isolated CMMC evidence for OSIbeyond DIB accounts",
    open:
      "As OSIbeyond expands CMMC / DIB compliance delivery across managed IT and cybersecurity clients, how do you keep each client's evidence registers isolated today — without shared-stack register risk?",
  },
  {
    id: "7d567b29-5cf6-43ce-b51f-4c30c9b669e7",
    label: "TechHeights",
    subject: "client-isolated CMMC / HIPAA evidence for TechHeights accounts",
    open:
      "As TechHeights runs managed compliance (CMMC RPO, HIPAA, NIST) across Southern California client environments, how do you keep each client's evidence registers isolated today — without shared-stack register risk?",
  },
  {
    id: "9108e6c4-ea1e-4dcd-8d3d-a99f25301f44",
    label: "SPCG",
    subject: "client-isolated governance evidence across SPCG MSP-partner accounts",
    open:
      "When Solution Providers Consulting Group helps MSPs deliver AI and data governance across mid-market client environments, how do you keep each client's evidence and compliance registers isolated today — without shared-stack register risk?",
  },
];

function firstName(full) {
  return String(full || "there").trim().split(/\s+/)[0] || "there";
}

function buildTouch1Body({ name, open }) {
  return [
    `Hi ${name},`,
    "",
    open,
    "",
    "Ironframe is built for that: hard tenant walls, residual risk modeled in whole cents internally, and exportable auditor-ready evidence — so client leadership sees estimated financial exposure (ranges and assumptions visible), not another subjective heatmap.",
    "",
    "We're opening a small Command Design Partner cohort.",
    "$4,999 flat for a 90-day seat around 2–3 success criteria you set.",
    "",
    "Worth a 10–15 min workflow review this week?",
    "",
    SIG,
  ].join("\n");
}

function pack({ subject, body, label }) {
  return [
    `${PENDING} ${subject}`,
    "--- Agent Proposed Reply Text ---",
    body,
    "--- Prospect Context ---",
    "Beachhead Sector: MSSP_ENCLAVE",
    "Quantified loss exposure (¢): pending operator baseline bind",
    `HITL note: Touch 1 accuracy pass 2026-08-25 (${label}) — researched open + human voice. PREP ONLY.`,
    "Cadence: TOUCH1",
    "Execution Source: salesTeamPoll | Channel:EMAIL",
  ].join("\n");
}

const prisma = new PrismaClient();

try {
  const updated = [];
  for (const f of FIXES) {
    const row = await prisma.ironboardCrmInteraction.findUnique({
      where: { id: f.id },
      select: {
        id: true,
        contact: { select: { fullName: true, company: true, email: true } },
      },
    });
    if (!row) {
      updated.push({ id: f.id, ok: false, reason: "missing" });
      continue;
    }
    const body = buildTouch1Body({
      name: firstName(row.contact?.fullName),
      open: f.open,
    });
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
        id: f.id,
        label: f.label,
        ok: false,
        voiceIssues: voice.issues,
        gateErrors: gate.errors,
      });
      continue;
    }
    const summary = pack({ subject: f.subject, body, label: f.label });
    const write = await updatePendingSalesDraftOnly(prisma, {
      id: f.id,
      summary,
      occurredAt: new Date(),
    });
    if (!write.ok) {
      updated.push({
        id: f.id,
        label: f.label,
        ok: false,
        reason: write.reason,
      });
      continue;
    }
    updated.push({
      id: f.id,
      label: f.label,
      buyer: row.contact?.fullName,
      ok: true,
      open: f.open.slice(0, 100),
    });
  }
  console.log(JSON.stringify({ ok: true, updated }, null, 2));
} finally {
  await prisma.$disconnect();
}
