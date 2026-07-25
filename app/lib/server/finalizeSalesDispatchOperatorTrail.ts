import "server-only";

import { advanceInboundLeadAfterSalesDispatch } from "@/app/lib/server/inboundLeadOpsCore";
import { logIcpShortlistTouch } from "@/app/lib/server/icpShortlistTouchLogCore";

/**
 * After successful SALES wire send: record C3 TOUCH1 + advance inbound checklist.
 * Never sends mail/SMS — caller already DISPATCHed. Failures are logged, not thrown.
 */
export async function finalizeSalesDispatchOperatorTrail(input: {
  company: string;
  channel: "EMAIL" | "SMS";
  interactionId: string;
  to: string;
  email?: string | null;
  dealId?: string | null;
  loggedBy?: string | null;
}): Promise<{ touchLogged: boolean; inboundAdvanced: boolean }> {
  let touchLogged = false;
  let inboundAdvanced = false;

  try {
    await logIcpShortlistTouch({
      touch: "TOUCH1",
      channel: input.channel,
      company: input.company,
      interactionId: input.interactionId,
      dealId: input.dealId,
      to: input.to,
      nextTouchNote: "Wait reply / Touch 2 day 4–5",
      loggedBy: input.loggedBy ?? "auto:SALES_DISPATCH",
    });
    touchLogged = true;
  } catch (err) {
    console.warn("[sales-dispatch] auto TOUCH1 log failed", err);
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

  return { touchLogged, inboundAdvanced };
}
