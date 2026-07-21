/**
 * R2 — Message lock spot-check for newest SALES PENDING drafts.
 */
import { PrismaClient } from "@prisma/client";

const TAG = "[PENDING SALES DRAFT APPROVAL]";
const p = new PrismaClient();

function parseDraft(summary) {
  const subject =
    summary.match(/\[PENDING SALES DRAFT APPROVAL\]\s*(.+)/i)?.[1]?.trim() ??
    "";
  const replyMatch = summary.match(
    /--- Agent Proposed Reply Text ---\s*([\s\S]*?)\s*--- (?:Tracking Core|Prospect Context) ---/,
  );
  const body =
    replyMatch?.[1]?.trim() ??
    summary.replace(TAG, "").trim();
  return { subject, body, full: summary };
}

function checkLocks(text) {
  const t = text;
  return {
    R2_1: {
      name: "Offer Frame",
      mustSee: /\$4,?999|4999/i.test(t) && (/path\s*b/i.test(t) || /90[- ]?day/i.test(t) || /co-builder/i.test(t)),
      mustNotSee: !/free\s*(poc|pilot|trial)/i.test(t),
      detail: {
        has4999: /\$4,?999|4999/i.test(t),
        hasPathB: /path\s*b/i.test(t),
        has90Day: /90[- ]?day/i.test(t),
        hasCoBuilder: /co-builder/i.test(t),
        hasFreeOffer: /free\s*(poc|pilot|trial)/i.test(t),
      },
    },
    R2_2: {
      name: "Call-to-Action",
      mustSee: /10\s*[–-]\s*15\s*min|10-15\s*min|workflow review/i.test(t),
      mustNotSee: !(/request demo/i.test(t) && !/workflow review/i.test(t)),
      detail: {
        hasWorkflowReview: /workflow review/i.test(t),
        has1015: /10\s*[–-]\s*15|10-15/i.test(t),
        hasRequestDemo: /request demo/i.test(t),
      },
    },
    R2_3: {
      name: "Customer Overclaims",
      mustNotSee: !/\b(medshield|vaultbank|gridcore)\b/i.test(t),
      detail: {
        mentionsDemoSlug: (t.match(/\b(medshield|vaultbank|gridcore)\b/gi) || []),
      },
    },
    R2_4: {
      name: "Channel Readiness",
      // filled per-draft below
    },
  };
}

try {
  const tenant = await p.tenant.findUnique({
    where: { slug: "prospect-pool" },
    select: { id: true },
  });
  if (!tenant) throw new Error("prospect-pool missing");

  const rows = await p.ironboardCrmInteraction.findMany({
    where: {
      tenantId: tenant.id,
      summary: { contains: TAG },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      contact: {
        select: {
          id: true,
          fullName: true,
          company: true,
          email: true,
          phone: true,
        },
      },
      deal: { select: { id: true, stage: true } },
    },
  });

  // Newest per deal
  const newestByDeal = new Map();
  const dupes = [];
  for (const row of rows) {
    const key = row.dealId || row.id;
    if (!newestByDeal.has(key)) newestByDeal.set(key, row);
    else dupes.push(row);
  }

  const drafts = [...newestByDeal.values()];
  console.log(
    JSON.stringify(
      {
        pendingSalesTotal: rows.length,
        uniqueContacts: drafts.length,
        staleDuplicates: dupes.length,
        duplicateIds: dupes.map((d) => ({
          id: d.id,
          company: d.contact?.company,
          createdAt: d.createdAt,
        })),
      },
      null,
      2,
    ),
  );

  for (const row of drafts) {
    const { subject, body, full } = parseDraft(row.summary);
    const text = `${subject}\n${body}`;
    const locks = checkLocks(text);
    const email = row.contact?.email || "";
    const phone = row.contact?.phone || "";
    const fakeLocal = /@ironleads\.local$/i.test(email);
    const realEmail = Boolean(email) && !fakeLocal && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const realPhone = /^\+[1-9]\d{7,14}$/.test(phone.replace(/[\s()-]/g, ""));
    const channelOk = realEmail || realPhone;
    const channelNote = fakeLocal
      ? realPhone
        ? "PASS — email is @ironleads.local; must DISPATCH SMS"
        : "FAIL — @ironleads.local and no valid phone"
      : realEmail
        ? "PASS — real email (EMAIL or SMS if phone present)"
        : realPhone
          ? "PASS — SMS only (no real email)"
          : "FAIL — no reachable channel";

    locks.R2_4 = {
      name: "Channel Readiness",
      pass: channelOk,
      detail: { email, phone, fakeLocal, realEmail, realPhone, channelNote },
    };

    const r21 = locks.R2_1.mustSee && locks.R2_1.mustNotSee;
    const r22 = locks.R2_2.mustSee && locks.R2_2.mustNotSee;
    const r23 = locks.R2_3.mustNotSee;
    const r24 = locks.R2_4.pass;

    console.log("---");
    console.log(
      JSON.stringify(
        {
          interactionId: row.id,
          company: row.contact?.company,
          createdAt: row.createdAt,
          subject,
          bodyPreview: body.slice(0, 700),
          R2_1_OfferFrame: r21 ? "PASS" : "FAIL",
          R2_1_detail: locks.R2_1.detail,
          R2_2_CTA: r22 ? "PASS" : "FAIL",
          R2_2_detail: locks.R2_2.detail,
          R2_3_Overclaims: r23 ? "PASS" : "FAIL",
          R2_3_detail: locks.R2_3.detail,
          R2_4_Channel: r24 ? "PASS" : "FAIL",
          R2_4_detail: locks.R2_4.detail,
          R2_ALL: r21 && r22 && r23 && r24 ? "PASS" : "FAIL",
        },
        null,
        2,
      ),
    );
  }
} finally {
  await p.$disconnect();
}
