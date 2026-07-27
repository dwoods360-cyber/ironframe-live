/**
 * Non-acquisition prep: cut over Path B / Command Tier Stripe to LIVE.
 *
 * Does NOT dispatch to prospects. Does NOT flip counsel D0.
 *
 * Steps this script performs when --execute:
 *  1. Require sk_live_ secret
 *  2. Ensure live Command Tier product + $4,999 one-time price + payment links
 *  3. Print values to set on Vercel Production
 *
 * You still must:
 *  - vercel env add/update STRIPE_CREDENTIAL_MODE=live
 *  - vercel env add/update NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL=<provision link>
 *  - keep IRONFRAME_PUBLIC_INSTANT_CHECKOUT_ENABLED off
 *  - redeploy production
 *
 * Usage:
 *   npx vercel env run -e production -- npx tsx scripts/ops/cutover-stripe-pathb-live.ts
 *   npx vercel env run -e production -- npx tsx scripts/ops/cutover-stripe-pathb-live.ts --execute
 */
import { resolve } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";

import { config } from "dotenv";
import Stripe from "stripe";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

const PRODUCT_METADATA_KEY = "ironframe_catalog";
const PRODUCT_METADATA_VALUE = "command_tier_v1";
const COMMAND_TIER_UNIT_AMOUNT_CENTS = 4_999_00;
const ACTIVATION_TEST_SLUG = "stripe-act-b1";

function resolveLiveSecret(): string {
  // Prefer dedicated live key; otherwise STRIPE_SECRET_KEY if already live.
  const dedicated = process.env.STRIPE_SECRET_KEY_LIVE?.trim() ?? "";
  const primary = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (dedicated.startsWith("sk_live_")) return dedicated;
  if (primary.startsWith("sk_live_")) return primary;
  return "";
}

async function findOrCreateProduct(stripe: Stripe): Promise<Stripe.Product> {
  const listed = await stripe.products.list({ limit: 100, active: true });
  const existing = listed.data.find(
    (product) => product.metadata[PRODUCT_METADATA_KEY] === PRODUCT_METADATA_VALUE,
  );
  if (existing) return existing;
  return stripe.products.create({
    name: "Ironframe Command Tier",
    description:
      "Multi-tenant GRC command post — Path B design-partner on-ramp ($4,999) and Command Tier commercial seat.",
    metadata: {
      [PRODUCT_METADATA_KEY]: PRODUCT_METADATA_VALUE,
      plan_sku: "COMMAND_TIER",
    },
  });
}

async function findOrCreatePrice(stripe: Stripe, productId: string): Promise<Stripe.Price> {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 20 });
  const existing = prices.data.find(
    (price) =>
      price.unit_amount === COMMAND_TIER_UNIT_AMOUNT_CENTS &&
      price.currency === "usd" &&
      price.type === "one_time",
  );
  if (existing) return existing;
  return stripe.prices.create({
    product: productId,
    unit_amount: COMMAND_TIER_UNIT_AMOUNT_CENTS,
    currency: "usd",
    metadata: {
      plan_sku: "COMMAND_TIER",
      base_price_cents: String(COMMAND_TIER_UNIT_AMOUNT_CENTS),
    },
  });
}

async function findOrCreatePaymentLink(
  stripe: Stripe,
  input: {
    priceId: string;
    catalogKey: string;
    metadata?: Stripe.MetadataParam;
    paymentIntentMetadata?: Stripe.MetadataParam;
  },
): Promise<Stripe.PaymentLink> {
  const listed = await stripe.paymentLinks.list({ limit: 100, active: true });
  const existing = listed.data.find((link) => link.metadata?.ironframe_link === input.catalogKey);
  if (existing) return existing;
  return stripe.paymentLinks.create({
    line_items: [{ price: input.priceId, quantity: 1 }],
    metadata: {
      ironframe_link: input.catalogKey,
      ...(input.metadata ?? {}),
    },
    ...(input.paymentIntentMetadata
      ? {
          payment_intent_data: {
            metadata: input.paymentIntentMetadata,
          },
        }
      : {}),
  });
}

async function main(): Promise<void> {
  const execute = process.argv.includes("--execute");
  const currentMode = (process.env.STRIPE_CREDENTIAL_MODE || "").trim().toLowerCase();
  const checkoutUrl = process.env.NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL?.trim() || "";
  const liveSecret = resolveLiveSecret();
  const secretKind = liveSecret
    ? "LIVE"
    : (process.env.STRIPE_SECRET_KEY || "").startsWith("sk_test_")
      ? "TEST_ONLY"
      : "MISSING";

  const preflight = {
    ok: false as boolean,
    mode: execute ? "EXECUTE" : "DRY-RUN",
    currentCredentialMode: currentMode || null,
    secretKind,
    checkoutLooksTest: /\/test[_/]/i.test(checkoutUrl),
    checkoutPath: (() => {
      try {
        return new URL(checkoutUrl).pathname;
      } catch {
        return null;
      }
    })(),
    instantCheckout:
      process.env.IRONFRAME_PUBLIC_INSTANT_CHECKOUT_ENABLED?.trim().toLowerCase() || null,
    counselD0:
      (
        process.env.NEXT_PUBLIC_IRONFRAME_COUNSEL_D0_APPROVED ||
        process.env.IRONFRAME_COUNSEL_D0_APPROVED ||
        ""
      )
        .trim()
        .toLowerCase() || null,
    blocker:
      secretKind !== "LIVE"
        ? "No sk_live_ secret available in this environment. Add STRIPE_SECRET_KEY (live) or STRIPE_SECRET_KEY_LIVE on Vercel Production, then re-run locally."
        : null,
  };

  if (secretKind !== "LIVE") {
    console.log(JSON.stringify(preflight, null, 2));
    process.exit(2);
  }

  const stripe = new Stripe(liveSecret);
  const product = await findOrCreateProduct(stripe);
  const price = await findOrCreatePrice(stripe, product.id);

  let provisionLink: Stripe.PaymentLink | null = null;
  let activationLink: Stripe.PaymentLink | null = null;

  if (execute) {
    provisionLink = await findOrCreatePaymentLink(stripe, {
      priceId: price.id,
      catalogKey: "provision",
      metadata: {
        slug: "provision-template",
        companyName: "Ironframe Command Tier Customer",
      },
    });
    activationLink = await findOrCreatePaymentLink(stripe, {
      priceId: price.id,
      catalogKey: "activation",
      paymentIntentMetadata: {
        tenant_slug: ACTIVATION_TEST_SLUG,
      },
    });
  }

  const artifact = {
    generatedAt: new Date().toISOString(),
    mode: "live" as const,
    productId: product.id,
    priceId: price.id,
    unitAmountCents: COMMAND_TIER_UNIT_AMOUNT_CENTS,
    provisionPaymentLinkUrl: provisionLink?.url ?? null,
    activationPaymentLinkUrl: activationLink?.url ?? null,
    vercelEnvUpdates: {
      STRIPE_CREDENTIAL_MODE: "live",
      NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL: provisionLink?.url ?? "(set after --execute)",
      IRONFRAME_PUBLIC_INSTANT_CHECKOUT_ENABLED: "0",
      NEXT_PUBLIC_IRONFRAME_COUNSEL_D0_APPROVED: "keep off until counsel returns",
    },
    nextCommands: [
      "npx vercel env rm STRIPE_CREDENTIAL_MODE production --yes  # if replacing",
      "printf live | npx vercel env add STRIPE_CREDENTIAL_MODE production",
      "printf '<provisionPaymentLinkUrl>' | npx vercel env add NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL production",
      "npx vercel --prod",
    ],
  };

  preflight.ok = true;
  console.log(JSON.stringify({ ...preflight, catalog: artifact }, null, 2));

  if (execute && provisionLink?.url) {
    const dir = resolve(process.cwd(), "scripts/dev");
    mkdirSync(dir, { recursive: true });
    const path = resolve(dir, "stripe-catalog-artifact.live.json");
    writeFileSync(path, JSON.stringify(artifact, null, 2), "utf8");
    console.log(`\nWrote ${path}`);
    console.log("Set Vercel Production env from vercelEnvUpdates, then redeploy.");
  } else if (!execute) {
    console.log("\nDry-run OK (live key present). Re-run with --execute to mint/reuse live payment links.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
