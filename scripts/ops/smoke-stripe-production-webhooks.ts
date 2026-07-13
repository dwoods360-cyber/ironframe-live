/**
 * Phase 5 — production signed Stripe webhook probes (test or live secrets).
 *
 * Loads secrets from .env.production.vercel (vercel env pull) or .env.local fallback.
 * Proves cryptographic verification + handler routing on ironframegrc.com — no paid charge.
 *
 * Usage:
 *   npm run smoke:stripe:production-webhooks
 *   PRODUCTION_ORIGIN=https://ironframegrc.com npm run smoke:stripe:production-webhooks
 */
import { resolve } from "node:path";

import { config } from "dotenv";
import type Stripe from "stripe";

import {
  resolveBillingWebhookSecret,
  resolveInstantWebhookSecret,
  resolveStripeSecretKey,
  signStripePayload,
} from "../dev/stripeSmokeEnv";

const PRODUCTION_ORIGIN = (process.env.PRODUCTION_ORIGIN ?? "https://ironframegrc.com").replace(
  /\/$/,
  "",
);

function loadProductionStripeEnv(): void {
  config({ path: resolve(process.cwd(), ".env") });
  config({ path: resolve(process.cwd(), ".env.local") });

  const localFallback = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY?.trim() ?? "",
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "",
    STRIPE_BILLING_WEBHOOK_SECRET: process.env.STRIPE_BILLING_WEBHOOK_SECRET?.trim() ?? "",
    STRIPE_INSTANT_CHECKOUT_WEBHOOK_SECRET:
      process.env.STRIPE_INSTANT_CHECKOUT_WEBHOOK_SECRET?.trim() ?? "",
  };

  config({ path: resolve(process.cwd(), ".env.production.vercel"), override: true });

  for (const [key, value] of Object.entries(localFallback)) {
    if (value && !process.env[key]?.trim()) {
      process.env[key] = value;
    }
  }
}

type ProbeResult = {
  name: string;
  ok: boolean;
  detail: string;
};

async function postSigned(input: {
  path: "/api/webhooks/stripe" | "/api/billing/webhook";
  payload: string;
  secret: string;
  stripeSecretKey: string;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const signature = signStripePayload(input.payload, input.secret, input.stripeSecretKey);
  const response = await fetch(`${PRODUCTION_ORIGIN}${input.path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body: input.payload,
  });
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    body = { raw: "non-json" };
  }
  return { status: response.status, body };
}

async function main(): Promise<void> {
  loadProductionStripeEnv();

  const stripeSecretKey = resolveStripeSecretKey();
  const instantSecret = resolveInstantWebhookSecret();
  const billingSecret = resolveBillingWebhookSecret();

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY missing — run: npx vercel env pull .env.production.vercel --environment=production");
  }
  if (!instantSecret || !billingSecret) {
    throw new Error(
      "Webhook secrets missing — set STRIPE_INSTANT_CHECKOUT_WEBHOOK_SECRET + STRIPE_BILLING_WEBHOOK_SECRET (or STRIPE_WEBHOOK_SECRET).",
    );
  }

  const mode = stripeSecretKey.startsWith("sk_live_") ? "live" : "test";
  console.log(`=== Production signed webhook probes (${PRODUCTION_ORIGIN}, Stripe ${mode}) ===\n`);

  const probes: ProbeResult[] = [];

  const ignoredEvent = {
    id: `evt_prod_ignored_${Date.now()}`,
    object: "event",
    type: "customer.created",
    data: { object: {} },
  } as Stripe.Event;
  const ignoredPayload = JSON.stringify(ignoredEvent);
  const ignored = await postSigned({
    path: "/api/webhooks/stripe",
    payload: ignoredPayload,
    secret: instantSecret,
    stripeSecretKey,
  });
  probes.push({
    name: "POST /api/webhooks/stripe (signed ignored event)",
    ok: ignored.status === 200 && ignored.body.ignored === "customer.created",
    detail: `status=${ignored.status} ignored=${String(ignored.body.ignored ?? "")}`,
  });

  const missingSlugEvent = {
    id: `evt_prod_missing_${Date.now()}`,
    object: "event",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_prod_smoke",
        object: "payment_intent",
        amount_received: 100,
        customer: "cus_prod_smoke",
        metadata: {},
      },
    },
  } as Stripe.Event;
  const missingSlug = await postSigned({
    path: "/api/billing/webhook",
    payload: JSON.stringify(missingSlugEvent),
    secret: billingSecret,
    stripeSecretKey,
  });
  probes.push({
    name: "POST /api/billing/webhook (signed, missing tenant_slug)",
    ok: missingSlug.status === 422,
    detail: `status=${missingSlug.status}`,
  });

  const badSig = await fetch(`${PRODUCTION_ORIGIN}/api/billing/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": "invalid" },
    body: "{}",
  });
  probes.push({
    name: "POST /api/billing/webhook (bad signature)",
    ok: badSig.status === 400,
    detail: `status=${badSig.status}`,
  });

  let failed = 0;
  for (const probe of probes) {
    const mark = probe.ok ? "PASS" : "FAIL";
    console.log(`${mark}  ${probe.name} — ${probe.detail}`);
    if (!probe.ok) failed += 1;
  }

  if (failed > 0) {
    console.error(`\n${failed} signed webhook probe(s) failed.`);
    console.error(
      "If signature verification fails (400 on signed events), webhook secrets in Vercel do not match Stripe Dashboard endpoints.",
    );
    process.exit(1);
  }

  console.log("\nAll production signed webhook probes passed.");
  if (mode === "test") {
    console.log(
      "Note: Production STRIPE_CREDENTIAL_MODE is test — acceptable for pilot; set live before commercial GA.",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
