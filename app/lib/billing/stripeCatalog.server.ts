import "server-only";

import Stripe from "stripe";

const PRODUCT_METADATA_KEY = "ironframe_catalog";
const PRODUCT_METADATA_VALUE = "command_tier_v1";
const COMMAND_TIER_UNIT_AMOUNT_CENTS = 4_999_00;

export async function resolveCommandTierPriceId(stripe: Stripe): Promise<string | null> {
  const listed = await stripe.products.list({ limit: 100, active: true });
  const product = listed.data.find(
    (row) => row.metadata[PRODUCT_METADATA_KEY] === PRODUCT_METADATA_VALUE,
  );
  if (!product) return null;

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 20 });
  const exact = prices.data.find(
    (price) =>
      price.type === "one_time" &&
      price.currency === "usd" &&
      price.unit_amount === COMMAND_TIER_UNIT_AMOUNT_CENTS,
  );
  if (exact?.id) return exact.id;

  const fallback = prices.data.find(
    (price) => price.type === "one_time" && price.currency === "usd",
  );
  return fallback?.id ?? null;
}
