import type Stripe from "stripe";

import { normalizeProvisionedTenantSlug } from "@/app/lib/tenantSlugRegistry";

export type ParsedCheckoutSessionMetadata = {
  email: string;
  slug: string;
  companyName: string;
  amountTotalCents: bigint;
  stripeCustomerId: string;
  checkoutSessionId: string;
  invitationToken: string | null;
};

export type ParseCheckoutSessionResult =
  | { ok: true; data: ParsedCheckoutSessionMetadata }
  | { ok: false; error: string };

function readMetadataString(
  metadata: Stripe.Metadata | null | undefined,
  key: string,
): string {
  const raw = metadata?.[key];
  return typeof raw === "string" ? raw.trim() : "";
}

export function parseCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): ParseCheckoutSessionResult {
  const checkoutSessionId = session.id?.trim() ?? "";
  if (!checkoutSessionId) {
    return { ok: false, error: "Checkout session id missing." };
  }

  const email = (
    session.customer_details?.email ??
    session.customer_email ??
    readMetadataString(session.metadata, "email")
  )
    .trim()
    .toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Checkout session missing valid customer email." };
  }

  const companyName =
    readMetadataString(session.metadata, "companyName") ||
    readMetadataString(session.metadata, "company_name");

  const slugRaw =
    readMetadataString(session.metadata, "slug") ||
    readMetadataString(session.metadata, "tenant_slug");

  const slug = normalizeProvisionedTenantSlug(slugRaw);
  if (!slug) {
    return { ok: false, error: "Checkout metadata.slug is missing or invalid." };
  }

  const name = companyName.length >= 2 ? companyName : slug.replace(/-/g, " ");
  const amountRaw = session.amount_total;
  const amountTotalCents =
    amountRaw == null || amountRaw < 0 ? 0n : BigInt(Math.trunc(amountRaw));

  const customerRef = session.customer;
  const stripeCustomerId =
    typeof customerRef === "string"
      ? customerRef.trim()
      : customerRef && typeof customerRef === "object" && "id" in customerRef
        ? String(customerRef.id ?? "").trim()
        : "";

  if (!stripeCustomerId) {
    return { ok: false, error: "Checkout session missing stripe customer id." };
  }

  const invitationToken =
    readMetadataString(session.metadata, "invitationToken") ||
    readMetadataString(session.metadata, "invitation_token") ||
    null;

  return {
    ok: true,
    data: {
      email,
      slug,
      companyName: name,
      amountTotalCents,
      stripeCustomerId,
      checkoutSessionId,
      invitationToken,
    },
  };
}
