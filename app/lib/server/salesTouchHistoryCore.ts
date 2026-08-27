import "server-only";

import prisma from "@/lib/prisma";
import { DISPATCHED_SALES_DRAFT_TAG } from "@/app/lib/server/approvalQueueCore";
import {
  MAX_TRACKED_TOUCH_ORDINAL,
  nextTouchOrdinalFromPriorSends,
  touchStageFromOrdinal,
  type SalesTouchNumber,
} from "@/app/lib/salesTouchCadence";

/**
 * Count-based touch history. See `app/lib/salesTouchCadence.ts` for why the
 * `Cadence:` tag cannot be trusted as the arbiter of how many emails a contact
 * has already received.
 */

export {
  buildCadenceTraceLine,
  parseCadenceTouch,
  touchStageFromOrdinal,
  withCadenceTraceLine,
  type SalesTouchNumber,
} from "@/app/lib/salesTouchCadence";

export type SalesTouchHistory = {
  contactId: string;
  /** DISPATCHED sales rows already on the wire (excluding any excluded id). */
  priorSendCount: number;
  lastSentAt: Date | null;
  /** 1-based position the next send would occupy. May exceed 3. */
  nextTouchOrdinal: number;
  nextTouch: SalesTouchNumber;
  /** True when the contact is already past the modelled 3-touch cadence. */
  beyondTrackedCadence: boolean;
};

/**
 * Pass the row currently being dispatched as `excludeInteractionId` so the
 * result is stable whether it is called before or after that row flips to
 * DISPATCHED.
 */
export async function fetchSalesTouchHistory(input: {
  contactId: string;
  excludeInteractionId?: string | null;
}): Promise<SalesTouchHistory> {
  const rows = await prisma.ironboardCrmInteraction.findMany({
    where: {
      contactId: input.contactId,
      summary: { contains: DISPATCHED_SALES_DRAFT_TAG },
      ...(input.excludeInteractionId ? { id: { not: input.excludeInteractionId } } : {}),
    },
    orderBy: { occurredAt: "asc" },
    select: { occurredAt: true },
  });

  const priorSendCount = rows.length;
  const nextTouchOrdinal = nextTouchOrdinalFromPriorSends(priorSendCount);

  return {
    contactId: input.contactId,
    priorSendCount,
    lastSentAt: rows.length ? rows[rows.length - 1]!.occurredAt : null,
    nextTouchOrdinal,
    nextTouch: touchStageFromOrdinal(nextTouchOrdinal),
    beyondTrackedCadence: nextTouchOrdinal > MAX_TRACKED_TOUCH_ORDINAL,
  };
}

/** Touch number a send from this contact's row should be recorded as. */
export async function resolveOutgoingTouchNumber(input: {
  contactId: string;
  excludeInteractionId?: string | null;
}): Promise<SalesTouchNumber> {
  const history = await fetchSalesTouchHistory(input);
  return history.nextTouch;
}
