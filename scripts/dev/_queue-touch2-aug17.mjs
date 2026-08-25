/**
 * Queue Touch 2 PENDING SALES drafts for buyers whose Touch 1 was sent 2026-08-17 (CT).
 * PREP ONLY — does not DISPATCH.
 */
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { updatePendingSalesDraftOnly } from "../../app/lib/salesDraftWriteGuard.ts";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const PENDING = "[PENDING SALES DRAFT APPROVAL]";
const DISPATCHED = "[DISPATCHED SALES COURIER]";
const SIG = ["Best,", "Dereck", "Founder, Ironframe", "dereck@ironframegrc.com"].join("\n");

/** CT calendar day bounds in UTC (CDT = UTC-5 on 2026-08-17). */
const DAY_START = new Date("2026-08-17T05:00:00.000Z");
const DAY_END = new Date("2026-08-18T05:00:00.000Z");

const TARGETS = [
  {
    email: "jbohrer@abacusgroupllc.com",
    firstName: "Jonathan",
    companyLabel: "Abacus",
    subject: "Re: Multi-client GRC isolation & dollar-risk reporting for Abacus",
    reAnchor:
      "Still thinking about how Abacus keeps each financial-services and healthcare client’s compliance evidence and board reporting isolated across AbacusFlex environments?",
  },
  {
    email: "ruppert.vernon@absolutelogic.com",
    firstName: "Ruppert",
    companyLabel: "Absolute Logic",
    subject: "Re: co-builder seat — Absolute Logic",
    reAnchor:
      "Still thinking about how Absolute Logic keeps each client’s HIPAA / GLBA / NYDFS evidence registers isolated today?",
  },
  {
    email: "mark.clayman@netrio.com",
    firstName: "Mark",
    companyLabel: "Netrio",
    subject: "Re: co-builder seat — Netrio",
    reAnchor:
      "Still thinking about how Netrio keeps each client’s GRC and board reporting isolated as Agio financial-services environments come onto the stack?",
  },
  {
    email: "lalvarez@alvareztg.com",
    firstName: "Luis",
    companyLabel: "Alvarez Technology Group",
    subject: "Re: co-builder seat — Alvarez Technology Group",
    reAnchor:
      "Still thinking about how Alvarez keeps each CMMC / DIB client’s evidence registers isolated across readiness engagements?",
  },
  {
    email: "kparekh@amsysis.com",
    firstName: "Khalid",
    companyLabel: "AMSYS",
    subject: "Re: co-builder seat — AMSYS",
    reAnchor:
      "Still thinking about how AMSYS keeps each client’s compliance evidence and board reporting isolated across managed environments?",
  },
];

function buildBody(firstName, reAnchor) {
  return [
    `Hi ${firstName},`,
    "",
    reAnchor,
    "",
    "Short follow-up: cohort is capped at 3–5 seats so we can honor roadmap influence without scope sprawl.",
    "",
    "If that friction is still real, the paid Command Design Partner seat ($4,999) is the on-ramp — convert or exit at day 90 with criteria you named.",
    "",
    "Worth a 10–15 min workflow review this week?",
    "",
    SIG,
  ].join("\n");
}

function buildSummary({ subject, body, companyLabel }) {
  return [
    `${PENDING} ${subject}`,
    "--- Agent Proposed Reply Text ---",
    body,
    "--- Prospect Context ---",
    `Beachhead Sector: MSSP_ENCLAVE`,
    `Quantified loss exposure (¢): pending operator baseline bind`,
    `HITL note: Touch 2 day 4–5 for ${companyLabel} (Aug 17 Touch 1 cohort). Target-specific re-anchor applied. PREP ONLY — operator DISPATCH required.`,
    `Cadence: TOUCH2`,
    `Execution Source: salesTeamPoll | Channel:EMAIL`,
  ].join("\n");
}

const prisma = new PrismaClient();
const dry = process.argv.includes("--dry");

try {
  const created = [];
  const skipped = [];

  for (const target of TARGETS) {
    const dispatched = await prisma.ironboardCrmInteraction.findFirst({
      where: {
        summary: { contains: DISPATCHED },
        occurredAt: { gte: DAY_START, lt: DAY_END },
        contact: { email: { equals: target.email, mode: "insensitive" } },
      },
      orderBy: { occurredAt: "asc" },
      select: {
        id: true,
        tenantId: true,
        contactId: true,
        dealId: true,
        occurredAt: true,
        contact: {
          select: { fullName: true, company: true, email: true },
        },
      },
    });

    if (!dispatched?.contactId || !dispatched.tenantId) {
      skipped.push({ email: target.email, reason: "no_aug17_dispatch" });
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

    if (existingPending) {
      const isTouch2 =
        /Cadence:\s*TOUCH2/i.test(existingPending.summary) ||
        /Touch 2 day 4/i.test(existingPending.summary);
      if (isTouch2) {
        skipped.push({
          email: target.email,
          reason: "touch2_pending_exists",
          interactionId: existingPending.id,
        });
        continue;
      }
      // Replace stale Touch-1-shaped pending with Touch 2 (prep only).
      const body = buildBody(target.firstName, target.reAnchor);
      const summary = buildSummary({
        subject: target.subject,
        body,
        companyLabel: target.companyLabel,
      });
      if (!dry) {
        const write = await updatePendingSalesDraftOnly(prisma, {
          id: existingPending.id,
          summary,
          occurredAt: new Date(),
        });
        if (!write.ok) {
          skipped.push({
            email: target.email,
            reason: write.reason,
            interactionId: existingPending.id,
          });
          continue;
        }
      }
      created.push({
        action: "updated_existing_pending",
        interactionId: existingPending.id,
        email: target.email,
        company: dispatched.contact?.company,
        buyer: dispatched.contact?.fullName,
        subject: target.subject,
        touch1At: dispatched.occurredAt,
        approvalsHref: `https://ironframegrc.com/dashboard/admin/approvals?kind=SALES&draft=${existingPending.id}`,
      });
      continue;
    }

    const body = buildBody(target.firstName, target.reAnchor);
    const summary = buildSummary({
      subject: target.subject,
      body,
      companyLabel: target.companyLabel,
    });
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

    created.push({
      action: dry ? "would_create" : "created",
      interactionId: id,
      email: target.email,
      company: dispatched.contact?.company,
      buyer: dispatched.contact?.fullName,
      subject: target.subject,
      touch1At: dispatched.occurredAt,
      approvalsHref: `https://ironframegrc.com/dashboard/admin/approvals?kind=SALES&draft=${id}`,
    });
  }

  console.log(JSON.stringify({ ok: true, dry, created, skipped }, null, 2));
} finally {
  await prisma.$disconnect();
}
