/**
 * Verify production Stripe has live Path B / Command Tier catalog signals.
 * Read-only — does not mint checkout or charge.
 *
 * Usage:
 *   npx vercel env run -e production -- npx tsx scripts/ops/verify-stripe-pathb-live-readiness.ts
 */
import { resolve } from "node:path";

import { config } from "dotenv";
import Stripe from "stripe";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

async function main(): Promise<void> {
  const secret =
    process.env.STRIPE_SECRET_KEY_LIVE?.trim() ||
    process.env.STRIPE_SECRET_KEY?.trim() ||
    "";
  const mode = (process.env.STRIPE_CREDENTIAL_MODE || "").toLowerCase();
  const checkoutPublic = process.env.NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL?.trim() || "";
  const instantCheckout = (
    process.env.IRONFRAME_PUBLIC_INSTANT_CHECKOUT_ENABLED || ""
  )
    .trim()
    .toLowerCase();
  const counsel = (
    process.env.NEXT_PUBLIC_IRONFRAME_COUNSEL_D0_APPROVED ||
    process.env.IRONFRAME_COUNSEL_D0_APPROVED ||
    ""
  )
    .trim()
    .toLowerCase();

  const keyKind = secret.startsWith("sk_live_")
    ? "LIVE"
    : secret.startsWith("sk_test_")
      ? "TEST"
      : secret
        ? "UNKNOWN"
        : "MISSING";

  const report: Record<string, unknown> = {
    stripeCredentialMode: mode || "(unset)",
    secretKeyKind: keyKind,
    commandTierCheckoutUrlSet: /^https:\/\//i.test(checkoutPublic),
    publicInstantCheckoutEnabled: ["1", "true", "yes"].includes(instantCheckout),
    counselD0Approved: ["1", "true", "yes"].includes(counsel),
  };

  if (!secret || keyKind === "MISSING") {
    console.log(JSON.stringify({ ok: false, error: "No Stripe secret", ...report }, null, 2));
    process.exit(2);
  }

  const stripe = new Stripe(secret, { apiVersion: "2025-04-30.basil" as Stripe.LatestApiVersion });
  const prices = await stripe.prices.list({ active: true, limit: 100, expand: ["data.product"] });
  const pathBish = prices.data.filter((p) => {
    const product =
      typeof p.product === "object" && p.product && !("deleted" in p.product && p.product.deleted)
        ? p.product
        : null;
    const hay = `${p.nickname ?? ""} ${product && "name" in product ? product.name : ""} ${p.id}`.toLowerCase();
    return (
      p.unit_amount === 499900 ||
      /path\s*b|command|design.?partner|activation/i.test(hay)
    );
  });

  report.pathBCandidatePrices = pathBish.map((p) => ({
    id: p.id,
    unitAmount: p.unit_amount,
    currency: p.currency,
    nickname: p.nickname,
    product:
      typeof p.product === "object" && p.product && "name" in p.product
        ? p.product.name
        : p.product,
  }));
  report.has499900Price = pathBish.some((p) => p.unit_amount === 499900);
  report.ok =
    keyKind === "LIVE" &&
    Boolean(report.has499900Price) &&
    report.commandTierCheckoutUrlSet === true &&
    report.publicInstantCheckoutEnabled === false;

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
