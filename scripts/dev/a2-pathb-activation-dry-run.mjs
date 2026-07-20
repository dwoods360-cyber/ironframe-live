/**
 * A2 dry-run: mint a Path B Checkout Session for a throwaway tenant slug.
 * TEST mode only — refuses sk_live_. Does not complete payment.
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const env = { ...process.env, ...loadEnvLocal() };
const mode = (env.STRIPE_CREDENTIAL_MODE || "").toLowerCase();
const secret =
  mode === "test"
    ? env.STRIPE_SECRET_KEY_TEST || env.STRIPE_SECRET_KEY || ""
    : mode === "live"
      ? env.STRIPE_SECRET_KEY_LIVE || env.STRIPE_SECRET_KEY || ""
      : env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY_TEST || "";

const checkoutPublic = env.NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL || "";

console.log("=== A2 Path B activation dry-run ===");
console.log("STRIPE_CREDENTIAL_MODE:", mode || "(auto from key)");
console.log(
  "SECRET_MODE_HINT:",
  secret.startsWith("sk_live_")
    ? "LIVE"
    : secret.startsWith("sk_test_")
      ? "TEST"
      : secret
        ? "UNKNOWN"
        : "MISSING",
);
console.log(
  "COMMAND_TIER_CHECKOUT_SET:",
  checkoutPublic.startsWith("https://") ? "yes" : "no",
);

if (!secret) {
  console.error("FAIL: No Stripe secret key in .env.local");
  process.exit(2);
}

if (secret.startsWith("sk_live_") || mode === "live") {
  console.error(
    "FAIL: Live Stripe credentials detected. A2 dry-run refuses live mode. Set STRIPE_CREDENTIAL_MODE=test and use sk_test_.",
  );
  process.exit(3);
}

if (!secret.startsWith("sk_test_")) {
  console.error("FAIL: Expected sk_test_ secret for dry-run.");
  process.exit(3);
}

const Stripe = require("stripe");
const stripe = new Stripe(secret);

const throwawaySlug = `a2-dryrun-${Date.now().toString(36)}`;
const priceCandidates = await stripe.prices.list({
  active: true,
  limit: 100,
  expand: ["data.product"],
});
const price = priceCandidates.data.find(
  (p) =>
    p.unit_amount === 499900 &&
    p.currency === "usd" &&
    (p.metadata?.plan_sku === "COMMAND_TIER" ||
      p.nickname?.toLowerCase().includes("command") ||
      true),
);

if (!price) {
  console.error(
    "FAIL: No active $4,999 USD price found. Run: npm run stripe:provision-catalog",
  );
  process.exit(4);
}

const customer = await stripe.customers.create({
  name: `A2 Dry-run ${throwawaySlug}`,
  metadata: {
    commercial_flow: "a2_dry_run",
    tenant_slug: throwawaySlug,
  },
});

const session = await stripe.checkout.sessions.create({
  mode: "payment",
  customer: customer.id,
  client_reference_id: `dryrun-${throwawaySlug}`,
  line_items: [{ price: price.id, quantity: 1 }],
  success_url: "http://127.0.0.1:3000/get-started?billingRefresh=1&a2=1",
  cancel_url: "http://127.0.0.1:3000/pricing?a2=cancel",
  metadata: {
    commercial_flow: "tenant_activation",
    tenant_slug: throwawaySlug,
    a2_dry_run: "1",
  },
  payment_intent_data: {
    metadata: {
      commercial_flow: "tenant_activation",
      tenant_slug: throwawaySlug,
      a2_dry_run: "1",
    },
  },
});

console.log("PASS: Checkout session minted (unpaid)");
console.log("throwaway_slug:", throwawaySlug);
console.log("price_id:", price.id);
console.log("unit_amount_cents:", price.unit_amount);
console.log("customer_id:", customer.id);
console.log("session_id:", session.id);
console.log("session_status:", session.status);
console.log("session_url_host:", session.url ? new URL(session.url).host : "(none)");
console.log(
  "NOTE: Do not open and pay unless you intentionally want a TEST charge. Session left unpaid.",
);
process.exit(0);
