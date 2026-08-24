import "server-only";

import prisma from "@/lib/prisma";
import {
  isIronleadsLocalEmail,
  isOperatorDryRunEmail,
  isSalesDispatchHoldCompany,
} from "@/app/lib/approvalDispatchValidation";
import { DISPATCHED_SALES_DRAFT_TAG } from "@/app/lib/server/approvalQueueCore";
import { isOperatorHoldArchived } from "@/app/lib/server/ironleadsOperatorHoldCore";
import { touch2ReAnchorFor } from "@/app/lib/salesTouch2ReAnchors";

/** Touch 2 earliest = Touch 1 sent + this many calendar days (day 4–5 window opens at day 4). */
export const TOUCH2_EARLIEST_OFFSET_DAYS = 4;

export type Touch2DueStatus = "YES" | "WAIT" | "DONE";

export type Touch2QueueRow = {
  rank: number;
  interactionId: string;
  contactId: string;
  buyer: string;
  company: string;
  email: string;
  touch1SentAt: string;
  touch2EarliestAt: string;
  dueStatus: Touch2DueStatus;
  dispatchCount: number;
  reAnchor: string | null;
  motion: string | null;
};

export type Touch2QueuePayload = {
  generatedAt: string;
  dueCount: number;
  waitCount: number;
  doneCount: number;
  rows: Touch2QueueRow[];
};

export function addCalendarDays(isoOrDate: Date, days: number): Date {
  const d = new Date(isoOrDate.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function computeTouch2DueStatus(input: {
  touch1SentAt: Date;
  now?: Date;
  dispatchCount: number;
}): Touch2DueStatus {
  if (input.dispatchCount >= 2) return "DONE";
  const earliest = addCalendarDays(input.touch1SentAt, TOUCH2_EARLIEST_OFFSET_DAYS);
  const now = input.now ?? new Date();
  return now.getTime() >= earliest.getTime() ? "YES" : "WAIT";
}

function uniqueKey(email: string, contactId: string): string {
  const e = email.trim().toLowerCase();
  return e || `contact:${contactId}`;
}

/**
 * Live Touch 2 queue: unique Path B buyers with a DISPATCHED SALES courier,
 * sorted by Touch 1 sent date ascending. Excludes HOLD / dry-run / harvest placeholders.
 */
export async function fetchSalesTouch2Queue(options?: {
  now?: Date;
}): Promise<Touch2QueuePayload> {
  const now = options?.now ?? new Date();

  const rows = await prisma.ironboardCrmInteraction.findMany({
    where: {
      summary: { contains: DISPATCHED_SALES_DRAFT_TAG },
      contactId: { not: null },
    },
    orderBy: { occurredAt: "asc" },
    take: 500,
    select: {
      id: true,
      contactId: true,
      occurredAt: true,
      contact: {
        select: {
          fullName: true,
          company: true,
          email: true,
          metadata: true,
        },
      },
    },
  });

  type Acc = {
    interactionId: string;
    contactId: string;
    buyer: string;
    company: string;
    email: string;
    touch1SentAt: Date;
    dispatchCount: number;
  };

  const byKey = new Map<string, Acc>();

  for (const row of rows) {
    if (!row.contact || !row.contactId) continue;
    const company = (row.contact.company ?? "").trim();
    const email = (row.contact.email ?? "").trim();
    if (isSalesDispatchHoldCompany(company)) continue;
    if (isOperatorHoldArchived(row.contact.metadata)) continue;
    if (isOperatorDryRunEmail(email)) continue;
    if (isIronleadsLocalEmail(email)) continue;

    const key = uniqueKey(email, row.contactId);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        interactionId: row.id,
        contactId: row.contactId,
        buyer: (row.contact.fullName ?? "").trim() || "Unknown",
        company: company || "Unknown",
        email,
        touch1SentAt: row.occurredAt,
        dispatchCount: 1,
      });
    } else {
      existing.dispatchCount += 1;
    }
  }

  const sorted = [...byKey.values()].sort(
    (a, b) => a.touch1SentAt.getTime() - b.touch1SentAt.getTime(),
  );

  const mapped: Touch2QueueRow[] = sorted.map((row, index) => {
    const touch2EarliestAt = addCalendarDays(row.touch1SentAt, TOUCH2_EARLIEST_OFFSET_DAYS);
    const dueStatus = computeTouch2DueStatus({
      touch1SentAt: row.touch1SentAt,
      now,
      dispatchCount: row.dispatchCount,
    });
    const enrichment = touch2ReAnchorFor({
      email: row.email,
      company: row.company,
      buyer: row.buyer,
    });
    return {
      rank: index + 1,
      interactionId: row.interactionId,
      contactId: row.contactId,
      buyer: row.buyer,
      company: row.company,
      email: row.email,
      touch1SentAt: row.touch1SentAt.toISOString(),
      touch2EarliestAt: touch2EarliestAt.toISOString(),
      dueStatus,
      dispatchCount: row.dispatchCount,
      reAnchor: enrichment?.reAnchor ?? null,
      motion: enrichment?.motion ?? null,
    };
  });

  return {
    generatedAt: now.toISOString(),
    dueCount: mapped.filter((r) => r.dueStatus === "YES").length,
    waitCount: mapped.filter((r) => r.dueStatus === "WAIT").length,
    doneCount: mapped.filter((r) => r.dueStatus === "DONE").length,
    rows: mapped,
  };
}
