"use server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { adminOnboardingProvisionHref } from "@/app/lib/approvalDispatchValidation";
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
  | { ok: true; provisionHref: string; notified: boolean }
  | { ok: false; error: string };

/**
 * After partner types AGREED: notify ops/admin with a prefilled provision deep-link.
 * Does not provision and does not mint Stripe — SoD handoff only.
 */
export async function notifyOrderFormAgreedAction(
  input: NotifyOrderFormAgreedInput,
): Promise<NotifyOrderFormAgreedResult> {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return { ok: false, error: auth.error };
  }

  const customerLegalName = String(input.customerLegalName ?? "").trim();
  const operatorEmail = String(input.operatorEmail ?? "").trim().toLowerCase();
  const workspaceSlug = String(input.workspaceSlug ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  const billingEmail = String(input.billingEmail ?? "").trim().toLowerCase();

  if (!customerLegalName || customerLegalName.length < 2) {
    return { ok: false, error: "Customer legal name is required before AGREED notify." };
  }
  if (!operatorEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(operatorEmail)) {
    return { ok: false, error: "Client-owned operator email is required before AGREED notify." };
  }
  if (!workspaceSlug) {
    return { ok: false, error: "Workspace slug is required before AGREED notify." };
  }

  const provisionHref = adminOnboardingProvisionHref({
    name: customerLegalName,
    email: operatorEmail,
    slug: workspaceSlug,
  });
  const absoluteProvision = `https://ironframegrc.com${provisionHref}`;

  const criteria = (input.successCriteria ?? [])
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 3);

  let notified = false;
  try {
    const delivery = await notifyOpsChannels({
      subject: `AGREED · ${CUSTOMER_FACING_PATH_B_SKU} ready to provision — ${customerLegalName}`,
      text: [
        "Order form locked with AGREED. Provision Path B (admin SoD) — do not use /pricing.",
        "",
        `Customer: ${customerLegalName}`,
        `Operator email (client-owned): ${operatorEmail}`,
        billingEmail && billingEmail !== operatorEmail ? `Billing email: ${billingEmail}` : null,
        `Workspace slug: ${workspaceSlug}`,
        input.pilotWindowDays ? `Window days: ${input.pilotWindowDays}` : null,
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
      provisionHref,
      notified: false,
    };
  }

  return { ok: true, provisionHref, notified };
}
