/**
 * Phase 1 — Stripe test-mode catalog: Command Tier product, price, and payment links.
 *
 * Usage: npm run stripe:provision-catalog
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import Stripe from "stripe";

import { loadStripeSmokeEnv, resolveStripeSecretKey, upsertEnvLocalVar } from "./stripeSmokeEnv";

const PRODUCT_METADATA_KEY = "ironframe_catalog";
const PRODUCT_METADATA_VALUE = "command_tier_v1";
const COMMAND_TIER_UNIT_AMOUNT_CENTS = 4_999_00;
const ACTIVATION_TEST_SLUG = "stripe-act-b1";

async function findOrCreateProduct(stripe: Stripe): Promise<Stripe.Product> {
  const listed = await stripe.products.list({ limit: 100, active: true });
  const existing = listed.data.find(
    (product) => product.metadata[PRODUCT_METADATA_KEY] === PRODUCT_METADATA_VALUE,
  );
  if (existing) {
    console.log(`Reusing product ${existing.id}`);
    return existing;
  }

  const product = await stripe.products.create({
    name: "Ironframe Command Tier",
    description:
      "Multi-tenant GRC command post — sovereign workspace isolation, BigInt ALE baselines, Irongate pipeline.",
    metadata: {
      [PRODUCT_METADATA_KEY]: PRODUCT_METADATA_VALUE,
      plan_sku: "COMMAND_TIER",
    },
  });
  console.log(`Created product ${product.id}`);
  return product;
}

async function findOrCreatePrice(stripe: Stripe, productId: string): Promise<Stripe.Price> {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 20 });
  const existing = prices.data.find(
    (price) =>
      price.unit_amount === COMMAND_TIER_UNIT_AMOUNT_CENTS &&
      price.currency === "usd" &&
      price.type === "one_time",
  );
  if (existing) {
    console.log(`Reusing price ${existing.id}`);
    return existing;
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: COMMAND_TIER_UNIT_AMOUNT_CENTS,
    currency: "usd",
    metadata: {
      plan_sku: "COMMAND_TIER",
      base_price_cents: String(COMMAND_TIER_UNIT_AMOUNT_CENTS),
    },
  });
  console.log(`Created price ${price.id} ($${(COMMAND_TIER_UNIT_AMOUNT_CENTS / 100).toFixed(2)} USD)`);
  return price;
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
  if (existing) {
    console.log(`Reusing payment link ${existing.id} (${input.catalogKey})`);
    return existing;
  }

  const link = await stripe.paymentLinks.create({
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
  console.log(`Created payment link ${link.id} (${input.catalogKey})`);
  return link;
}

async function main(): Promise<void> {
  loadStripeSmokeEnv();
  const stripeSecretKey = resolveStripeSecretKey();
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is required in .env.local");
  }

  const stripe = new Stripe(stripeSecretKey);
  const product = await findOrCreateProduct(stripe);
  const price = await findOrCreatePrice(stripe, product.id);

  const provisionLink = await findOrCreatePaymentLink(stripe, {
    priceId: price.id,
    catalogKey: "provision",
    metadata: {
      slug: "provision-template",
      companyName: "Ironframe Command Tier Customer",
    },
  });

  const activationLink = await findOrCreatePaymentLink(stripe, {
    priceId: price.id,
    catalogKey: "activation",
    paymentIntentMetadata: {
      tenant_slug: ACTIVATION_TEST_SLUG,
    },
  });

  const artifact = {
    generatedAt: new Date().toISOString(),
    mode: stripeSecretKey.startsWith("sk_live_") ? "live" : "test",
    productId: product.id,
    priceId: price.id,
    unitAmountCents: COMMAND_TIER_UNIT_AMOUNT_CENTS,
    provisionPaymentLinkUrl: provisionLink.url,
    activationPaymentLinkUrl: activationLink.url,
    activationTestSlug: ACTIVATION_TEST_SLUG,
    notes: [
      "Provision link metadata is a template — mint per-partner links or Checkout Sessions for unique slugs.",
      "Activation link sets payment_intent.metadata.tenant_slug only; checkout.session.completed may 422 without slug.",
      "Set NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL to provisionPaymentLinkUrl for /pricing Buy now.",
    ],
  };

  const artifactDir = resolve(process.cwd(), "scripts/dev");
  mkdirSync(artifactDir, { recursive: true });
  const artifactPath = resolve(artifactDir, "stripe-catalog-artifact.json");
  writeFileSync(artifactPath, JSON.stringify(artifact, null, 2), "utf8");

  if (provisionLink.url) {
    upsertEnvLocalVar("NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL", provisionLink.url);
  }

  console.log("\n=== Stripe catalog provisioned (test mode) ===");
  console.log(`Artifact: ${artifactPath}`);
  console.log(`Provision URL (pricing): ${provisionLink.url}`);
  console.log(`Activation URL (Path B smoke): ${activationLink.url}`);
  console.log(`Updated .env.local → NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL`);
  console.log("\nNext: npm run smoke:stripe:ironclad (with npm run dev in another terminal)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
