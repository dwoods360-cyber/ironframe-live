/**
 * Human-voice rewrite for 2026-08-25 Touch 2 five (Assura grammar + peer register).
 * board-writer clarity bar / founder casual pitch — Sales HITL owns cold EMAIL.
 * PREP ONLY — does not DISPATCH.
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

const DRAFTS = [
  {
    id: "9a991af7-8cc9-4e4a-8bdb-fca57b832339",
    label: "Appalachia",
    subject: "Re: client-isolated CMMC evidence — Appalachia",
    body: [
      "Hi Mike,",
      "",
      "When Appalachia runs CMMC readiness across DIB contractor engagements, how do you keep each client's control evidence isolated today — without shared-stack register risk?",
      "",
      "We're only taking 3–5 Design Partner seats right now so we can build around how your team actually works — not a generic roadmap.",
      "",
      "$4,999 flat covers a 90-day seat around 2–3 criteria you set.",
      "Planned GA for Ironframe Command is about $35,000 a year.",
      "",
      "If isolating CMMC evidence packs is on your radar this quarter, open to a 10–15 minute workflow review next week — peer-to-peer, not a product tour?",
      "",
      SIG,
    ].join("\n"),
  },
  {
    id: "162b80a2-1a3d-4246-82f8-c4f6a5b45d75",
    label: "Arctiq",
    subject: "Re: client-isolated MXDR evidence — Arctiq",
    body: [
      "Hi Paul,",
      "",
      "When Arctiq runs ManagedIQ MXDR across your North American SOC delivery, how do you keep each client's evidence isolated today — without shared-stack register risk?",
      "",
      "We're only taking 3–5 Design Partner seats right now so we can build around how your team actually works — not a generic roadmap.",
      "",
      "$4,999 flat covers a 90-day seat around 2–3 criteria you set.",
      "Planned GA for Ironframe Command is about $35,000 a year.",
      "",
      "If isolating MXDR / SOC evidence is on your radar this quarter, open to a 10–15 minute workflow review next week — peer-to-peer, not a product tour?",
      "",
      SIG,
    ].join("\n"),
  },
  {
    id: "5d445047-45c6-4263-ab09-50485df77a07",
    label: "Ascend",
    subject: "Re: client-isolated MDR evidence — Ascend",
    body: [
      "Hi Amar,",
      "",
      "When Ascend runs 24/7 SOC MDR with SOC 2 / HIPAA / CMMC support across tenants, how do you keep each client's compliance evidence isolated today — without shared-stack register risk?",
      "",
      "We're only taking 3–5 Design Partner seats right now so we can build around how your team actually works — not a generic roadmap.",
      "",
      "$4,999 flat covers a 90-day seat around 2–3 criteria you set.",
      "Planned GA for Ironframe Command is about $35,000 a year.",
      "",
      "If isolating MDR / SOC evidence is on your radar this quarter, open to a 10–15 minute workflow review next week — peer-to-peer, not a product tour?",
      "",
      SIG,
    ].join("\n"),
  },
  {
    id: "4dd5ae31-2cd8-442c-9278-55be06b6d74d",
    label: "Assura",
    subject: "client-isolated evidence packs across Assura Virtual ISO accounts",
    body: [
      "Hi Karen,",
      "",
      "When Assura runs fractional CISO and multi-framework advisory across Virtual ISO retainers, how do you keep each client's evidence packs isolated today — without shared-stack register risk?",
      "",
      "We're only taking 3–5 Design Partner seats right now so we can build around how your team actually works — not a generic roadmap.",
      "",
      "$4,999 flat covers a 90-day seat around 2–3 criteria you set.",
      "Planned GA for Ironframe Command is about $35,000 a year.",
      "",
      "If isolating advisory evidence packs is on your radar this quarter, open to a 10–15 minute workflow review next week — peer-to-peer, not a product tour?",
      "",
      SIG,
    ].join("\n"),
  },
  {
    id: "15b6b2e6-a893-4e8e-b048-f32d99f142d2",
    label: "AT-NET",
    subject: "Re: client-isolated evidence — AT-NET",
    body: [
      "Hi Jeffrey,",
      "",
      "When AT-NET runs NIST-aligned managed IT with HIPAA / CMMC / PCI across client environments, how do you keep each client's evidence isolated today — without shared-stack register risk?",
      "",
      "We're only taking 3–5 Design Partner seats right now so we can build around how your team actually works — not a generic roadmap.",
      "",
      "$4,999 flat covers a 90-day seat around 2–3 criteria you set.",
      "Planned GA for Ironframe Command is about $35,000 a year.",
      "",
      "If isolating HIPAA / CMMC / PCI evidence is on your radar this quarter, open to a 10–15 minute workflow review next week — peer-to-peer, not a product tour?",
      "",
      SIG,
    ].join("\n"),
  },
];

function pack(subject, label, body) {
  return [
    `${PENDING} ${subject}`,
    "--- Agent Proposed Reply Text ---",
    body,
    "--- Prospect Context ---",
    "Beachhead Sector: MSSP_ENCLAVE",
    "Quantified loss exposure (¢): pending operator baseline bind",
    `HITL note: Touch 2 PREP 2026-08-25 (${label}). Peer/human voice rewrite — board-writer clarity bar; founder casual register. Grammar fixed. PREP ONLY.`,
    "Cadence: TOUCH2",
    "Execution Source: salesTeamPoll | Channel:EMAIL",
  ].join("\n");
}

const prisma = new PrismaClient();

try {
  const updated = [];
  for (const d of DRAFTS) {
    const voice = lintSalesHumanVoice(d.body);
    const gate = validateApprovalDispatch({
      draftKind: "SALES",
      channel: "EMAIL",
      body: d.body,
      recipientEmail: "buyer@example.com",
      recipientPhone: null,
      company: d.label,
      acknowledgeOperatorSelfDispatch: true,
    });
    if (!voice.ok || !gate.ok || !hasC1FounderEmailSignature(d.body)) {
      updated.push({
        id: d.id,
        label: d.label,
        ok: false,
        voiceIssues: voice.issues,
        gateErrors: gate.errors,
      });
      continue;
    }
    const summary = pack(d.subject, d.label, d.body);
    const write = await updatePendingSalesDraftOnly(prisma, {
      id: d.id,
      summary,
      occurredAt: new Date(),
    });
    if (!write.ok) {
      updated.push({
        id: d.id,
        label: d.label,
        ok: false,
        reason: write.reason,
      });
      continue;
    }
    updated.push({
      id: d.id,
      label: d.label,
      ok: true,
      approvalsHref: `https://ironframegrc.com/dashboard/admin/approvals?kind=SALES&draft=${d.id}`,
    });
  }
  console.log(JSON.stringify({ ok: true, updated }, null, 2));
} finally {
  await prisma.$disconnect();
}
