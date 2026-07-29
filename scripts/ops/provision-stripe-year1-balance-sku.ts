/**
 * Mint live Stripe SKU for year-1 Command balance after Path B convert credit.
 * $35,000 planned GA − $4,999 Path B credit = $30,001.
 *
 * Usage:
 *   STRIPE_SECRET_KEY_LIVE=sk_live_… npx tsx scripts/ops/provision-stripe-year1-balance-sku.ts
 *   STRIPE_SECRET_KEY_LIVE=sk_live_… npx tsx scripts/ops/provision-stripe-year1-balance-sku.ts --execute
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { config } from "dotenv";
import Stripe from "stripe";

import {
  COMMERCIAL_SKUS,
  DESIGN_PARTNER_CONVERT_CREDIT_USD,
  DESIGN_PARTNER_YEAR1_COMMAND_BALANCE_CENTS,
  DESIGN_PARTNER_YEAR1_COMMAND_BALANCE_USD,
  PLANNED_GA_COMMAND_USD,
} from "../../lib/ironframeProductKnowledge/commercial";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

const PRODUCT_METADATA_KEY = "ironframe_catalog";
const PRODUCT_METADATA_VALUE = "command_year1_balance_v1";
const UNIT_AMOUNT_CENTS = Number(DESIGN_PARTNER_YEAR1_COMMAND_BALANCE_CENTS);
const LINK_KEY = "command_year1_balance";

function resolveLiveSecret(): string {
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
    name: "Ironframe Command — Year-1 Balance",
    description:
      `Year-1 Ironframe Command after Path B convert credit: ` +
      `$${PLANNED_GA_COMMAND_USD.toLocaleString("en-US")} list − ` +
      `$${DESIGN_PARTNER_CONVERT_CREDIT_USD.toLocaleString("en-US")} Path B credit = ` +
      `$${DESIGN_PARTNER_YEAR1_COMMAND_BALANCE_USD.toLocaleString("en-US")}.`,
    metadata: {
      [PRODUCT_METADATA_KEY]: PRODUCT_METADATA_VALUE,
      plan_sku: COMMERCIAL_SKUS.COMMAND_YEAR1_BALANCE,
      list_usd: String(PLANNED_GA_COMMAND_USD),
      convert_credit_usd: String(DESIGN_PARTNER_CONVERT_CREDIT_USD),
      balance_usd: String(DESIGN_PARTNER_YEAR1_COMMAND_BALANCE_USD),
    },
  });
}

async function findOrCreatePrice(stripe: Stripe, productId: string): Promise<Stripe.Price> {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 20 });
  const existing = prices.data.find(
    (price) =>
      price.unit_amount === UNIT_AMOUNT_CENTS &&
      price.currency === "usd" &&
      price.type === "one_time",
  );
  if (existing) return existing;
  return stripe.prices.create({
    product: productId,
    unit_amount: UNIT_AMOUNT_CENTS,
    currency: "usd",
    metadata: {
      plan_sku: COMMERCIAL_SKUS.COMMAND_YEAR1_BALANCE,
      base_price_cents: String(UNIT_AMOUNT_CENTS),
      list_usd: String(PLANNED_GA_COMMAND_USD),
      convert_credit_usd: String(DESIGN_PARTNER_CONVERT_CREDIT_USD),
    },
  });
}

async function findOrCreatePaymentLink(
  stripe: Stripe,
  priceId: string,
): Promise<Stripe.PaymentLink> {
  const listed = await stripe.paymentLinks.list({ limit: 100, active: true });
  const existing = listed.data.find((link) => link.metadata?.ironframe_link === LINK_KEY);
  if (existing) return existing;
  return stripe.paymentLinks.create({
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      ironframe_link: LINK_KEY,
      plan_sku: COMMERCIAL_SKUS.COMMAND_YEAR1_BALANCE,
    },
  });
}

async function main(): Promise<void> {
  const execute = process.argv.includes("--execute");
  const liveSecret = resolveLiveSecret();
  if (!liveSecret) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          blocker:
            "No sk_live_ secret. Set STRIPE_SECRET_KEY_LIVE or STRIPE_SECRET_KEY and re-run.",
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }

  if (UNIT_AMOUNT_CENTS !== DESIGN_PARTNER_YEAR1_COMMAND_BALANCE_USD * 100) {
    throw new Error("Year-1 balance cents/USD mismatch");
  }

  const stripe = new Stripe(liveSecret);
  const product = await findOrCreateProduct(stripe);
  const price = await findOrCreatePrice(stripe, product.id);
  const paymentLink = execute ? await findOrCreatePaymentLink(stripe, price.id) : null;

  const artifact = {
    generatedAt: new Date().toISOString(),
    mode: "live" as const,
    sku: COMMERCIAL_SKUS.COMMAND_YEAR1_BALANCE,
    productId: product.id,
    priceId: price.id,
    unitAmountCents: UNIT_AMOUNT_CENTS,
    unitAmountUsd: DESIGN_PARTNER_YEAR1_COMMAND_BALANCE_USD,
    math: {
      plannedGaCommandUsd: PLANNED_GA_COMMAND_USD,
      pathBConvertCreditUsd: DESIGN_PARTNER_CONVERT_CREDIT_USD,
      year1BalanceUsd: DESIGN_PARTNER_YEAR1_COMMAND_BALANCE_USD,
    },
    paymentLinkUrl: paymentLink?.url ?? null,
  };

  console.log(JSON.stringify({ ok: true, execute, catalog: artifact }, null, 2));

  if (execute && paymentLink?.url) {
    const dir = resolve(process.cwd(), "scripts/dev");
    mkdirSync(dir, { recursive: true });
    const path = resolve(dir, "stripe-year1-balance-artifact.live.json");
    writeFileSync(path, JSON.stringify(artifact, null, 2), "utf8");
    console.log(`\nWrote ${path}`);
  } else if (!execute) {
    console.log("\nDry-run OK. Re-run with --execute to mint/reuse the payment link.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
