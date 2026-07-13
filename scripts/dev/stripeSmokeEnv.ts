import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { config } from "dotenv";
import Stripe from "stripe";

export const LOCAL_APP_ORIGIN = (process.env.LOCAL_APP_ORIGIN ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);

export function loadStripeSmokeEnv(): void {
  config({ path: resolve(process.cwd(), ".env") });
  config({ path: resolve(process.cwd(), ".env.local"), override: true });
}

export function resolveStripeSecretKey(): string {
  const mode = process.env.STRIPE_CREDENTIAL_MODE?.trim().toLowerCase();
  if (mode === "live") {
    return process.env.STRIPE_SECRET_KEY_LIVE?.trim() ?? process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  }
  if (mode === "test") {
    return process.env.STRIPE_SECRET_KEY_TEST?.trim() ?? process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  }
  return process.env.STRIPE_SECRET_KEY?.trim() ?? "";
}

export function resolveInstantWebhookSecret(): string {
  return (
    process.env.STRIPE_INSTANT_CHECKOUT_WEBHOOK_SECRET?.trim() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim() ||
    ""
  );
}

export function resolveBillingWebhookSecret(): string {
  return (
    process.env.STRIPE_BILLING_WEBHOOK_SECRET?.trim() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim() ||
    ""
  );
}

export function requireStripeSmokeEnv(): { stripeSecretKey: string; instantSecret: string; billingSecret: string } {
  const stripeSecretKey = resolveStripeSecretKey();
  const instantSecret = resolveInstantWebhookSecret();
  const billingSecret = resolveBillingWebhookSecret();

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY (or mode-specific key) is required in .env.local");
  }
  if (!instantSecret || !billingSecret) {
    throw new Error(
      "STRIPE_INSTANT_CHECKOUT_WEBHOOK_SECRET and STRIPE_BILLING_WEBHOOK_SECRET (or STRIPE_WEBHOOK_SECRET) are required.",
    );
  }

  return { stripeSecretKey, instantSecret, billingSecret };
}

export function signStripePayload(payload: string, secret: string, stripeSecretKey: string): string {
  const stripe = new Stripe(stripeSecretKey);
  return stripe.webhooks.generateTestHeaderString({ payload, secret });
}

export async function postSignedStripeWebhook(input: {
  path: "/api/webhooks/stripe" | "/api/billing/webhook";
  payload: string;
  secret: string;
  stripeSecretKey: string;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const signature = signStripePayload(input.payload, input.secret, input.stripeSecretKey);
  const response = await fetch(`${LOCAL_APP_ORIGIN}${input.path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body: input.payload,
  });
  const body = (await response.json()) as Record<string, unknown>;
  return { status: response.status, body };
}

export async function assertDevServerReachable(): Promise<void> {
  try {
    const response = await fetch(LOCAL_APP_ORIGIN, { method: "GET", redirect: "manual" });
    if (response.status >= 500) {
      throw new Error(`Dev server returned ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Dev server not reachable at ${LOCAL_APP_ORIGIN}. Start with: npm run dev\n${String(error)}`,
    );
  }
}

export function upsertEnvLocalVar(key: string, value: string): void {
  const envPath = resolve(process.cwd(), ".env.local");
  const line = `${key}="${value}"`;
  let contents: string;
  try {
    contents = readFileSync(envPath, "utf8");
  } catch {
    contents = "";
  }

  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(contents)) {
    contents = contents.replace(pattern, line);
  } else {
    contents = contents.trimEnd() + (contents.endsWith("\n") ? "" : "\n") + `${line}\n`;
  }
  writeFileSync(envPath, contents, "utf8");
}
