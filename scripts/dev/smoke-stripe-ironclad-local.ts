/**
 * Phase 3 — local ironclad Stripe proof (both webhook paths + negative cases).
 *
 * Prerequisites: npm run dev (port 3000)
 *
 * Usage: npm run smoke:stripe:ironclad
 */
import { spawnSync } from "node:child_process";

import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

import { TENANT_BILLING_STATUS } from "../../app/lib/billing/constants";

import {
  assertDevServerReachable,
  loadStripeSmokeEnv,
  postSignedStripeWebhook,
  requireStripeSmokeEnv,
} from "./stripeSmokeEnv";

const STRIPE_E2E_PROVISION_SLUG = "stripe-e2e-corp";
const ACTIVATION_SLUG = "stripe-act-b1";

function runNpmScript(script: string, args: string[] = []): void {
  console.log(`\n> npm run ${script} ${args.join(" ")}`.trim());
  const result = spawnSync("npm", ["run", script, "--", ...args], {
    cwd: process.cwd(),
    shell: process.platform === "win32",
    encoding: "utf8",
    env: process.env,
  });
  if (result.stdout?.trim()) console.log(result.stdout.trim());
  if (result.stderr?.trim()) console.error(result.stderr.trim());
  if (result.status !== 0) {
    throw new Error(`npm run ${script} failed with exit code ${result.status ?? "unknown"}`);
  }
}

async function assertNegativeCases(
  stripeSecretKey: string,
  instantSecret: string,
  billingSecret: string,
): Promise<void> {
  console.log("\n=== Negative cases ===");

  const badSignatureResponse = await fetch("http://127.0.0.1:3000/api/billing/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": "invalid",
    },
    body: "{}",
  });
  if (badSignatureResponse.status !== 400) {
    throw new Error(`Expected 400 for bad signature, got ${badSignatureResponse.status}`);
  }
  console.log("  ✓ bad stripe-signature → 400");

  const missingSlugEvent = {
    id: `evt_negative_${Date.now()}`,
    object: "event",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_negative",
        object: "payment_intent",
        amount_received: 100,
        customer: "cus_negative",
        metadata: {},
      },
    },
  } as Stripe.Event;
  const missingSlugPayload = JSON.stringify(missingSlugEvent);
  const missingSlugResult = await postSignedStripeWebhook({
    path: "/api/billing/webhook",
    payload: missingSlugPayload,
    secret: billingSecret,
    stripeSecretKey,
  });
  if (missingSlugResult.status !== 422) {
    throw new Error(`Expected 422 for missing tenant_slug, got ${missingSlugResult.status}`);
  }
  console.log("  ✓ payment_intent.succeeded without tenant_slug → 422");

  const ignoredEvent = {
    id: `evt_ignored_${Date.now()}`,
    object: "event",
    type: "customer.created",
    data: { object: {} },
  } as Stripe.Event;
  const ignoredPayload = JSON.stringify(ignoredEvent);
  const ignoredResult = await postSignedStripeWebhook({
    path: "/api/webhooks/stripe",
    payload: ignoredPayload,
    secret: instantSecret,
    stripeSecretKey,
  });
  if (ignoredResult.status !== 200 || ignoredResult.body.ignored !== "customer.created") {
    throw new Error("Expected 200 ignored for non-checkout events on provision webhook");
  }
  console.log("  ✓ non-checkout event on provision webhook → 200 ignored");
}

async function main(): Promise<void> {
  loadStripeSmokeEnv();
  const { stripeSecretKey, instantSecret, billingSecret } = requireStripeSmokeEnv();

  console.log("=== Phase 3: Stripe ironclad local smoke ===");
  await assertDevServerReachable();

  runNpmScript("smoke:stripe-e2e:provision", ["--reset"]);
  runNpmScript("smoke:billing:activation", ["--reset"]);

  const prisma = new PrismaClient();
  try {
    const pathABilling = await prisma.tenantBilling.findUnique({
      where: { tenantSlug: STRIPE_E2E_PROVISION_SLUG },
    });
    const activationBilling = await prisma.tenantBilling.findUnique({
      where: { tenantSlug: ACTIVATION_SLUG },
    });

    if (pathABilling?.status !== TENANT_BILLING_STATUS.ACTIVE) {
      throw new Error(`Expected ACTIVE billing for ${STRIPE_E2E_PROVISION_SLUG}`);
    }
    if (activationBilling?.status !== TENANT_BILLING_STATUS.ACTIVE) {
      throw new Error(`Expected ACTIVE billing for ${ACTIVATION_SLUG}`);
    }
    console.log(`\n  ✓ ${STRIPE_E2E_PROVISION_SLUG} billing ACTIVE (Path A)`);
    console.log(`  ✓ ${ACTIVATION_SLUG} billing ACTIVE (Path B)`);

    await assertNegativeCases(stripeSecretKey, instantSecret, billingSecret);

    console.log("\n=== Stripe ironclad local smoke PASSED ===");
    console.log("Record in checklist when ready:");
    console.log("  PA-BIL.A PASS — payment_intent.succeeded + checkout.session.completed local proof");
    console.log("  PA-BIL.B PASS — verify Activate for design partner on /admin/onboarding manually");
    console.log("Next: Phase 4 production env + Phase 5 live webhooks on ironframegrc.com");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("\nStripe ironclad local smoke FAILED:", error);
  process.exit(1);
});
