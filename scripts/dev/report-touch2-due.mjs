/**
 * READ-ONLY Touch 2 due list + cadence-tag drift detector.
 *
 * Due = contact has exactly ONE dispatched email, sent >= MIN_DAYS (default 7)
 * days ago, named buyer, real (non-placeholder) address, not a HOLD company.
 *
 * Touch numbers come from the count of DISPATCHED rows, never the `Cadence:`
 * tag — see app/lib/salesTouchCadence.ts. `tagDrift` reports rows whose tag
 * disagrees with chronological order, which is how the pre-2026-08-27 gap
 * (dispatch rebuilt the summary and dropped the cadence line) would resurface.
 *
 * Usage: npx tsx scripts/dev/report-touch2-due.mjs   (MIN_DAYS=6 to widen)
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import {
  isSalesDispatchHoldCompany,
  isOperatorDryRunEmail,
  isIronleadsLocalEmail,
} from "../../app/lib/approvalDispatchValidation.ts";
import { touch2ReAnchorFor } from "../../app/lib/salesTouch2ReAnchors.ts";
import { parseCadenceTouch, touchStageFromOrdinal } from "../../app/lib/salesTouchCadence.ts";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const DISPATCHED = "[DISPATCHED SALES COURIER]";
const PENDING = "[PENDING SALES DRAFT APPROVAL]";
const MIN_DAYS = Number(process.env.MIN_DAYS ?? 7);
const TODAY = new Date();

const prisma = new PrismaClient();
try {
  const rows = await prisma.ironboardCrmInteraction.findMany({
    where: { summary: { contains: DISPATCHED } },
    orderBy: { occurredAt: "asc" },
    select: {
      id: true,
      summary: true,
      occurredAt: true,
      contactId: true,
      contact: { select: { fullName: true, company: true, email: true } },
    },
  });

  const byContact = new Map();
  for (const r of rows) {
    if (!r.contactId) continue;
    const e = byContact.get(r.contactId) ?? {
      contactId: r.contactId,
      email: r.contact?.email ?? "",
      buyer: r.contact?.fullName ?? "",
      company: r.contact?.company ?? "",
      sends: [],
    };
    e.sends.push({
      id: r.id,
      at: r.occurredAt,
      tag: parseCadenceTouch(r.summary),
      subject:
        (String(r.summary).match(/\[DISPATCHED SALES COURIER\]\s*(.+)/) || [])[1]?.trim() ?? null,
    });
    byContact.set(r.contactId, e);
  }

  // Cadence tag must agree with chronological position, or the count-based
  // truth and the human-readable label have diverged again.
  const tagDrift = [];
  for (const c of byContact.values()) {
    c.sends.forEach((s, i) => {
      const expected = touchStageFromOrdinal(i + 1);
      if (s.tag !== expected) {
        tagDrift.push({
          interactionId: s.id,
          email: c.email,
          sentAt: new Date(s.at).toISOString().slice(0, 10),
          ordinal: i + 1,
          expected,
          tagged: s.tag,
        });
      }
    });
  }

  const due = [];
  const skipped = [];
  for (const c of byContact.values()) {
    const last = c.sends[c.sends.length - 1];
    const days = Math.floor((TODAY.getTime() - new Date(last.at).getTime()) / 86_400_000);
    const base = {
      email: c.email,
      buyer: c.buyer,
      company: c.company,
      contactId: c.contactId,
      sendCount: c.sends.length,
      lastSent: new Date(last.at).toISOString().slice(0, 10),
      daysSinceLast: days,
      lastSubject: last.subject,
    };
    if (c.sends.length !== 1) {
      skipped.push({ ...base, reason: "already_multi_touch" });
      continue;
    }
    if (days < MIN_DAYS) {
      skipped.push({ ...base, reason: "too_soon" });
      continue;
    }
    if (!c.email || isIronleadsLocalEmail(c.email) || isOperatorDryRunEmail(c.email)) {
      skipped.push({ ...base, reason: "placeholder_or_operator_inbox" });
      continue;
    }
    if (/^(info|sales|contact|hello|admin)@/i.test(c.email)) {
      skipped.push({ ...base, reason: "not_a_named_buyer_inbox" });
      continue;
    }
    if (isSalesDispatchHoldCompany(c.company)) {
      skipped.push({ ...base, reason: "hold_company" });
      continue;
    }
    const anchor = touch2ReAnchorFor({ email: c.email, company: c.company, buyer: c.buyer });
    const livePending = await prisma.ironboardCrmInteraction.findFirst({
      where: {
        contactId: c.contactId,
        summary: { contains: PENDING },
        NOT: {
          OR: [
            { summary: { contains: DISPATCHED } },
            { summary: { contains: "[PURGED DRAFT]" } },
            { summary: { contains: "[HOLD PARKED DRAFT]" } },
            { summary: { contains: "[NEEDS ENRICHMENT]" } },
          ],
        },
      },
      select: { id: true },
    });
    due.push({
      ...base,
      hasReAnchor: Boolean(anchor),
      motion: anchor?.motion ?? null,
      pendingId: livePending?.id ?? null,
    });
  }

  due.sort((a, b) => b.daysSinceLast - a.daysSinceLast);
  console.log(
    JSON.stringify(
      {
        minDays: MIN_DAYS,
        dispatchedRows: rows.length,
        contacts: byContact.size,
        tagDriftCount: tagDrift.length,
        tagDrift,
        dueCount: due.length,
        due,
        skippedSample: skipped.slice(0, 12),
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
