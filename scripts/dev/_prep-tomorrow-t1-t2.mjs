/**
 * Prep tomorrow (2026-08-25 CT) Approvals batch:
 * - Touch 1 Day 5 first five (polish HITL + ITC open)
 * - Touch 2 next five after Aug 17 (Appalachia → AT-NET)
 * PREP ONLY — does not DISPATCH.
 */
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { lintSalesHumanVoice } from "../../app/lib/salesHumanVoice.ts";
import { validateApprovalDispatch } from "../../app/lib/approvalDispatchValidation.ts";
import { hasC1FounderEmailSignature } from "../../app/lib/salesC1FounderSignature.ts";
import {
  updatePendingSalesDraftOnly,
} from "../../app/lib/salesDraftWriteGuard.ts";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const PENDING = "[PENDING SALES DRAFT APPROVAL]";
const DISPATCHED = "[DISPATCHED SALES COURIER]";
const SIG = ["Best,", "Dereck", "Founder, Ironframe", "dereck@ironframegrc.com"].join("\n");

const dry = process.argv.includes("--dry");

const T1 = [
  {
    id: "74313249-c2f1-48b3-90ae-6a525f9057aa",
    email: "kklein@dataendure.com",
    label: "DataEndure",
    // keep existing researched open unless missing
  },
  {
    id: "c26d501d-a3cc-4a76-9037-0ed9d7348a25",
    email: "pronca@datasure24.com",
    label: "DataSure24",
  },
  {
    id: "55c6abd0-89f5-4781-92ca-3e1f37cc620f",
    email: "beau.shahriary@directdefense.com",
    label: "DirectDefense",
  },
  {
    id: "60483116-3c52-432d-932d-95ca8997d4b3",
    email: "kevin.dawson@isacybersecurity.com",
    label: "ISA Cybersecurity",
  },
  {
    id: "873b8fdd-3e0b-47c7-a975-5596245c1f91",
    email: "arno.robbertse@itcsecure.com",
    label: "ITC Secure",
    forceOpen:
      "As ITC Secure delivers MXDR powered by Pulse across multi-client managed environments, how do you keep each client's evidence registers and board reporting isolated today — without shared-stack register risk?",
  },
];

const T2 = [
  {
    email: "mike.williams@appalachiatech.com",
    firstName: "Mike",
    companyLabel: "Appalachia",
    subject: "Re: co-builder seat — Appalachia Technologies",
    reAnchor:
      "When Appalachia runs CMMC readiness across DIB contractor engagements, how do you keep each client's control evidence isolated today — without shared-stack register risk?",
    friction: "CMMC evidence packs",
  },
  {
    email: "paul.kerr@dyntek.com",
    firstName: "Paul",
    companyLabel: "Arctiq",
    subject: "Re: co-builder seat — Arctiq",
    reAnchor:
      "When Arctiq runs ManagedIQ MXDR across your North American SOC delivery, how do you keep each client's evidence isolated today — without shared-stack register risk?",
    friction: "MXDR / SOC evidence",
  },
  {
    email: "apatel@teamascend.com",
    firstName: "Amar",
    companyLabel: "Ascend",
    subject: "Re: co-builder seat — Ascend Technologies",
    reAnchor:
      "When Ascend runs 24/7 SOC MDR with SOC 2 / HIPAA / CMMC support across tenants, how do you keep each client's compliance evidence isolated today — without shared-stack register risk?",
    friction: "MDR / SOC evidence",
  },
  {
    email: "karen.cole@assuraconsulting.com",
    firstName: "Karen",
    companyLabel: "Assura",
    subject: "Re: co-builder seat — Assura",
    reAnchor:
      "When Assura runs fractional CISO and multi-framework advisory across Virtual ISO retainers, how do you keep each client's evidence packs isolated today — without shared-stack register risk?",
    friction: "advisory evidence packs",
  },
  {
    email: "jeffrey.king@expertip.net",
    firstName: "Jeffrey",
    companyLabel: "AT-NET",
    subject: "Re: co-builder seat — AT-NET Services",
    reAnchor:
      "When AT-NET runs NIST-aligned managed IT with HIPAA / CMMC / PCI across client environments, how do you keep each client's evidence isolated today — without shared-stack register risk?",
    friction: "HIPAA / CMMC / PCI evidence",
  },
];

function extractOpen(body) {
  const paras = String(body || "")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  // skip greeting
  for (const p of paras) {
    if (/^hi\s+/i.test(p) && p.length < 40) continue;
    if (/isolated|shared-stack|register risk/i.test(p)) return p;
  }
  return paras[1] || paras[0] || "";
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

function buildTouch2Body({ firstName, reAnchor, friction }) {
  return [
    `Hi ${firstName},`,
    "",
    reAnchor,
    "",
    "We're only taking 3–5 Design Partner seats right now so we can build around how your team actually works — not a generic roadmap.",
    "",
    "$4,999 flat covers a 90-day seat around 2–3 criteria you set.",
    "Planned GA for Ironframe Command is about $35,000 a year.",
    "",
    `If isolating ${friction} is on your radar this quarter, open to a 10–15 minute workflow review next week — peer-to-peer, not a product tour?`,
    "",
    SIG,
  ].join("\n");
}

function packTouch1({ subject, body, label }) {
  return [
    `${PENDING} ${subject}`,
    "--- Agent Proposed Reply Text ---",
    body,
    "--- Prospect Context ---",
    "Beachhead Sector: MSSP_ENCLAVE",
    "Quantified loss exposure (¢): pending operator baseline bind",
    `HITL note: Touch 1 PREP for 2026-08-25 Day 5 (${label}). Human voice + researched open. PREP ONLY — operator DISPATCH required.`,
    "Cadence: TOUCH1",
    "Execution Source: salesTeamPoll | Channel:EMAIL",
  ].join("\n");
}

function packTouch2({ subject, body, label }) {
  return [
    `${PENDING} ${subject}`,
    "--- Agent Proposed Reply Text ---",
    body,
    "--- Prospect Context ---",
    "Beachhead Sector: MSSP_ENCLAVE",
    "Quantified loss exposure (¢): pending operator baseline bind",
    `HITL note: Touch 2 PREP for 2026-08-25 (${label} — next after Aug 17 wave). Human voice lock; GA optional on T2. PREP ONLY — operator DISPATCH required.`,
    "Cadence: TOUCH2",
    "Execution Source: salesTeamPoll | Channel:EMAIL",
  ].join("\n");
}

function firstName(full) {
  return String(full || "there").trim().split(/\s+/)[0] || "there";
}

const prisma = new PrismaClient();

try {
  const touch1 = [];
  const touch2 = [];

  for (const t of T1) {
    const row = await prisma.ironboardCrmInteraction.findUnique({
      where: { id: t.id },
      select: {
        id: true,
        summary: true,
        contact: { select: { fullName: true, company: true, email: true } },
      },
    });
    if (!row) {
      touch1.push({ id: t.id, ok: false, reason: "missing_draft" });
      continue;
    }
    const subject =
      (row.summary.match(/\[PENDING SALES DRAFT APPROVAL\]\s*(.+)/) || [])[1]?.trim() ||
      `client-isolated evidence for ${t.label}`;
    const priorBody =
      row.summary
        .split("--- Agent Proposed Reply Text ---")[1]
        ?.split("--- Prospect Context ---")[0]
        ?.trim() ?? "";
    const open = t.forceOpen || extractOpen(priorBody);
    const name = firstName(row.contact?.fullName);
    const body = buildTouch1Body({ name, open });
    const voice = lintSalesHumanVoice(body);
    const gate = validateApprovalDispatch({
      draftKind: "SALES",
      channel: "EMAIL",
      body,
      recipientEmail: row.contact?.email || t.email,
      recipientPhone: null,
      company: row.contact?.company || t.label,
      acknowledgeOperatorSelfDispatch: true,
    });
    if (!voice.ok || !gate.ok) {
      touch1.push({
        id: t.id,
        label: t.label,
        ok: false,
        voiceIssues: voice.issues,
        gateErrors: gate.errors,
      });
      continue;
    }
    const summary = packTouch1({ subject, body, label: t.label });
    if (!dry) {
      const write = await updatePendingSalesDraftOnly(prisma, {
        id: t.id,
        summary,
        occurredAt: new Date(),
      });
      if (!write.ok) {
        touch1.push({
          id: t.id,
          label: t.label,
          ok: false,
          reason: write.reason,
        });
        continue;
      }
    }
    touch1.push({
      id: t.id,
      label: t.label,
      buyer: row.contact?.fullName,
      ok: true,
      subject,
      open: open.slice(0, 120),
      approvalsHref: `https://ironframegrc.com/dashboard/admin/approvals?kind=SALES&draft=${t.id}`,
    });
  }

  for (const t of T2) {
    const dispatched = await prisma.ironboardCrmInteraction.findFirst({
      where: {
        summary: { contains: DISPATCHED },
        contact: { email: { equals: t.email, mode: "insensitive" } },
      },
      orderBy: { occurredAt: "desc" },
      select: {
        id: true,
        tenantId: true,
        contactId: true,
        dealId: true,
        occurredAt: true,
        contact: { select: { fullName: true, company: true, email: true } },
      },
    });
    if (!dispatched?.contactId || !dispatched.tenantId) {
      touch2.push({ email: t.email, ok: false, reason: "no_dispatch" });
      continue;
    }

    const existingPending = await prisma.ironboardCrmInteraction.findFirst({
      where: {
        contactId: dispatched.contactId,
        summary: { contains: PENDING },
        NOT: {
          OR: [
            { summary: { contains: "[PURGED DRAFT]" } },
            { summary: { contains: "[NEEDS ENRICHMENT]" } },
            { summary: { contains: "[HOLD PARKED DRAFT]" } },
          ],
        },
      },
      select: { id: true, summary: true },
    });

    const body = buildTouch2Body(t);
    const voice = lintSalesHumanVoice(body);
    const gate = validateApprovalDispatch({
      draftKind: "SALES",
      channel: "EMAIL",
      body,
      recipientEmail: t.email,
      recipientPhone: null,
      company: t.companyLabel,
      acknowledgeOperatorSelfDispatch: true,
    });
    if (!voice.ok || !gate.ok || !hasC1FounderEmailSignature(body)) {
      touch2.push({
        email: t.email,
        ok: false,
        voiceIssues: voice.issues,
        gateErrors: gate.errors,
      });
      continue;
    }

    const summary = packTouch2({
      subject: t.subject,
      body,
      label: t.companyLabel,
    });

    if (existingPending) {
      const isT2 =
        /Cadence:\s*TOUCH2/i.test(existingPending.summary) ||
        /Touch 2/i.test(existingPending.summary);
      if (isT2) {
        if (!dry) {
          const write = await updatePendingSalesDraftOnly(prisma, {
            id: existingPending.id,
            summary,
            occurredAt: new Date(),
          });
          if (!write.ok) {
            touch2.push({
              email: t.email,
              ok: false,
              reason: write.reason,
              id: existingPending.id,
            });
            continue;
          }
        }
        touch2.push({
          action: "updated_touch2",
          id: existingPending.id,
          label: t.companyLabel,
          buyer: dispatched.contact?.fullName,
          ok: true,
          approvalsHref: `https://ironframegrc.com/dashboard/admin/approvals?kind=SALES&draft=${existingPending.id}`,
        });
        continue;
      }
      // Replace stale T1 pending with T2 prep
      if (!dry) {
        const write = await updatePendingSalesDraftOnly(prisma, {
          id: existingPending.id,
          summary,
          occurredAt: new Date(),
        });
        if (!write.ok) {
          touch2.push({
            email: t.email,
            ok: false,
            reason: write.reason,
            id: existingPending.id,
          });
          continue;
        }
      }
      touch2.push({
        action: "replaced_pending_with_touch2",
        id: existingPending.id,
        label: t.companyLabel,
        buyer: dispatched.contact?.fullName,
        ok: true,
        approvalsHref: `https://ironframegrc.com/dashboard/admin/approvals?kind=SALES&draft=${existingPending.id}`,
      });
      continue;
    }

    const id = randomUUID();
    if (!dry) {
      await prisma.ironboardCrmInteraction.create({
        data: {
          id,
          tenantId: dispatched.tenantId,
          contactId: dispatched.contactId,
          dealId: dispatched.dealId,
          channel: "EMAIL",
          summary: summary.slice(0, 12_000),
          occurredAt: new Date(),
        },
      });
    }
    touch2.push({
      action: dry ? "would_create" : "created",
      id,
      label: t.companyLabel,
      buyer: dispatched.contact?.fullName,
      ok: true,
      touch1At: dispatched.occurredAt,
      approvalsHref: `https://ironframegrc.com/dashboard/admin/approvals?kind=SALES&draft=${id}`,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dry,
        forDate: "2026-08-25",
        touch1Ok: touch1.filter((x) => x.ok).length,
        touch2Ok: touch2.filter((x) => x.ok).length,
        touch1,
        touch2,
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
