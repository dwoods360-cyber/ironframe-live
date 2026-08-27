import "server-only";

import { advanceInboundLeadAfterSalesDispatch } from "@/app/lib/server/inboundLeadOpsCore";
import { logIcpShortlistTouch } from "@/app/lib/server/icpShortlistTouchLogCore";
import {
  resolveOutgoingTouchNumber,
  type SalesTouchNumber,
} from "@/app/lib/server/salesTouchHistoryCore";

/**
 * After successful SALES wire send: record the C3 touch + advance inbound checklist.
 * Never sends mail/SMS — caller already DISPATCHed. Failures are logged, not thrown.
 *
 * The touch number is derived from prior DISPATCHED rows for the contact. It used
 * to be hardcoded to TOUCH1, which logged every follow-up as a first touch and made
 * the shortlist log useless for deciding who was still owed a Touch 2.
 */
export async function finalizeSalesDispatchOperatorTrail(input: {
  company: string;
  channel: "EMAIL" | "SMS";
  interactionId: string;
  to: string;
  email?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  loggedBy?: string | null;
  /** Pre-resolved by the dispatch route; recomputed from history when absent. */
  touch?: SalesTouchNumber | null;
}): Promise<{ touchLogged: boolean; inboundAdvanced: boolean; touch: SalesTouchNumber }> {
  let touch: SalesTouchNumber = input.touch ?? "TOUCH1";
  if (!input.touch && input.contactId) {
    try {
      touch = await resolveOutgoingTouchNumber({
        contactId: input.contactId,
        excludeInteractionId: input.interactionId,
      });
    } catch (err) {
      console.warn("[sales-dispatch] touch history resolve failed; defaulting TOUCH1", err);
    }
  }

  let touchLogged = false;
  let inboundAdvanced = false;

  try {
    await logIcpShortlistTouch({
      touch,
      channel: input.channel,
      company: input.company,
      interactionId: input.interactionId,
      dealId: input.dealId,
      to: input.to,
      loggedBy: input.loggedBy ?? "auto:SALES_DISPATCH",
    });
    touchLogged = true;
  } catch (err) {
    console.warn("[sales-dispatch] auto touch log failed", err);
  }

  try {
    const advanced = await advanceInboundLeadAfterSalesDispatch({
      email: input.email,
      company: input.company,
      interactionId: input.interactionId,
    });
    inboundAdvanced = advanced.advanced;
  } catch (err) {
    console.warn("[sales-dispatch] inbound checklist advance failed", err);
  }

  return { touchLogged, inboundAdvanced, touch };
}
