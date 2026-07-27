"use server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { mintOrderFormAgreedHandoff } from "@/app/lib/server/orderFormAgreedHandoffCore";
import { notifyOpsChannels } from "@/app/lib/server/notifyOpsEmail";
import { CUSTOMER_FACING_PATH_B_SKU } from "@/lib/ironframeProductKnowledge/commercial";

export type NotifyOrderFormAgreedInput = {
  customerLegalName: string;
  operatorEmail: string;
  billingEmail?: string;
  workspaceSlug: string;
  pilotWindowDays?: number;
  successCriteria?: string[];
};

export type NotifyOrderFormAgreedResult =
  | {
      ok: true;
      provisionHref: string;
      handoffToken: string;
      notified: boolean;
    }
  | { ok: false; error: string };

/**
 * After partner types AGREED: mint SoD handoff + notify ops/admin with prefilled provision deep-link.
 * Does not provision and does not mint Stripe.
 */
export async function notifyOrderFormAgreedAction(
  input: NotifyOrderFormAgreedInput,
): Promise<NotifyOrderFormAgreedResult> {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return { ok: false, error: auth.error };
  }

  let handoff;
  try {
    handoff = await mintOrderFormAgreedHandoff({
      customerLegalName: input.customerLegalName,
      operatorEmail: input.operatorEmail,
      billingEmail: input.billingEmail,
      workspaceSlug: input.workspaceSlug,
      pilotWindowDays: input.pilotWindowDays,
      successCriteria: input.successCriteria,
      lockedByUserId: auth.userId,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to mint AGREED handoff.",
    };
  }

  const absoluteProvision = `https://ironframegrc.com${handoff.provisionHref}`;
  const criteria = handoff.successCriteria;

  let notified = false;
  try {
    const delivery = await notifyOpsChannels({
      subject: `AGREED · ${CUSTOMER_FACING_PATH_B_SKU} ready to provision — ${handoff.customerLegalName}`,
      text: [
        "Order form locked with AGREED. Provision Path B (admin SoD) — do not use /pricing.",
        "Handoff token is required for trusted Quick provision. Unlocking the form revokes this baton.",
        "",
        `Customer: ${handoff.customerLegalName}`,
        `Operator email (client-owned): ${handoff.operatorEmail}`,
        handoff.billingEmail && handoff.billingEmail !== handoff.operatorEmail
          ? `Billing email: ${handoff.billingEmail}`
          : null,
        `Workspace slug: ${handoff.workspaceSlug}`,
        handoff.pilotWindowDays ? `Window days: ${handoff.pilotWindowDays}` : null,
        "",
        criteria.length > 0 ? "Success criteria:" : null,
        ...criteria.map((c, i) => `${i + 1}. ${c}`),
        "",
        `Open prefilled Quick provision: ${absoluteProvision}`,
        "Send the minted Path B activation URL only to the client-owned operator email.",
      ]
        .filter((line) => line != null)
        .join("\n"),
    });
    notified = delivery.emailOk === true || delivery.endpointsOk > 0;
  } catch (err) {
    console.warn("[order-form-agreed] notify failed", err);
    return {
      ok: true,
      provisionHref: handoff.provisionHref,
      handoffToken: handoff.token,
      notified: false,
    };
  }

  return {
    ok: true,
    provisionHref: handoff.provisionHref,
    handoffToken: handoff.token,
    notified,
  };
}
