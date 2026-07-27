"use server";

import { requirePartnerProvisioner } from "@/app/lib/auth/partnerProvisionerAccess";
import {
  getOrderFormAgreedHandoffByToken,
  type OrderFormAgreedHandoff,
} from "@/app/lib/server/orderFormAgreedHandoffCore";

export type GetOrderFormAgreedHandoffResult =
  | { ok: true; handoff: OrderFormAgreedHandoff }
  | { ok: false; error: string; handoff?: OrderFormAgreedHandoff };

/** Admin onboarding: resolve AGREED handoff token for trusted Quick provision prefill. */
export async function getOrderFormAgreedHandoffAction(
  tokenRaw: string,
): Promise<GetOrderFormAgreedHandoffResult> {
  const gate = await requirePartnerProvisioner();
  if ("error" in gate) {
    return { ok: false, error: gate.error };
  }

  const handoff = await getOrderFormAgreedHandoffByToken(tokenRaw);
  if (!handoff) {
    return { ok: false, error: "AGREED handoff not found." };
  }
  if (handoff.status !== "active") {
    return {
      ok: false,
      error:
        handoff.status === "revoked"
          ? "Order form unlocked — handoff revoked. Re-lock with AGREED."
          : handoff.status === "consumed"
            ? "Handoff already consumed by a prior provision."
            : "AGREED handoff expired. Re-lock the order form.",
      handoff,
    };
  }
  return { ok: true, handoff };
}
