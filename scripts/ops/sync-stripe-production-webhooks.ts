/**
 * Align Stripe test-mode webhook signing secrets with Vercel Production.
 * Recreates ironframegrc.com webhook endpoints and prints secrets to set in Vercel.
 *
 * Usage:
 *   npm run ops:sync-stripe-production-webhooks -- --dry-run
 *   npm run ops:sync-stripe-production-webhooks -- --apply
 */
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { config } from "dotenv";
import Stripe from "stripe";

import { upsertEnvLocalVar } from "../dev/stripeSmokeEnv";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const ORIGIN = (process.env.PRODUCTION_ORIGIN ?? "https://ironframegrc.com").replace(/\/$/, "");
const APPLY = process.argv.includes("--apply");
const DRY_RUN = process.argv.includes("--dry-run") || !APPLY;

const TARGETS = [
  {
    path: "/api/webhooks/stripe",
    events: ["checkout.session.completed"] as const,
    vercelKey: "STRIPE_INSTANT_CHECKOUT_WEBHOOK_SECRET",
    fallbackVercelKey: "STRIPE_WEBHOOK_SECRET",
  },
  {
    path: "/api/billing/webhook",
    events: ["payment_intent.succeeded"] as const,
    vercelKey: "STRIPE_BILLING_WEBHOOK_SECRET",
    fallbackVercelKey: null,
  },
] as const;

function normalizeUrl(url: string): string {
  return url.replace(/^https:\/\/www\./, "https://").replace(/\/$/, "");
}

async function main(): Promise<void> {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey) {
    throw new Error("STRIPE_SECRET_KEY required in .env.local");
  }

  const stripe = new Stripe(stripeKey);
  const mode = stripeKey.startsWith("sk_live_") ? "live" : "test";
  console.log(`Stripe ${mode} — ${DRY_RUN ? "DRY RUN" : "APPLY"}\n`);

  const listed = await stripe.webhookEndpoints.list({ limit: 100 });
  const updates: Array<{ vercelKey: string; secret: string; url: string }> = [];

  for (const target of TARGETS) {
    const url = `${ORIGIN}${target.path}`;
    const matches = listed.data.filter(
      (row) => normalizeUrl(row.url) === normalizeUrl(url) || row.url === url.replace("https://", "https://www."),
    );

    console.log(`\n${target.path}`);
    console.log(`  existing endpoints: ${matches.length}`);
    for (const row of matches) {
      console.log(`    - ${row.id} ${row.status} ${row.url}`);
    }

    if (DRY_RUN) {
      console.log(`  would recreate → ${url} [${target.events.join(", ")}]`);
      console.log(`  Vercel key: ${target.vercelKey}`);
      continue;
    }

    for (const row of matches) {
      await stripe.webhookEndpoints.del(row.id);
      console.log(`  deleted ${row.id}`);
    }

    const created = await stripe.webhookEndpoints.create({
      url,
      enabled_events: [...target.events],
      description: `Ironframe PA-SEC.6 ${target.path} (${mode})`,
    });

    if (!created.secret) {
      throw new Error(`Stripe did not return signing secret for ${url}`);
    }

    updates.push({ vercelKey: target.vercelKey, secret: created.secret, url });
    upsertEnvLocalVar(target.vercelKey, created.secret);
    console.log(`  ✓ local .env.local → ${target.vercelKey}`);
    console.log(`  created ${created.id} → ${url}`);

    if (target.fallbackVercelKey) {
      updates.push({
        vercelKey: target.fallbackVercelKey,
        secret: created.secret,
        url: `${url} (fallback)`,
      });
      upsertEnvLocalVar(target.fallbackVercelKey, created.secret);
    }
  }

  if (DRY_RUN) {
    console.log("\nRe-run with --apply to recreate endpoints and push secrets to Vercel.");
    return;
  }

  console.log("\n=== Updating Vercel Production env ===\n");
  for (const row of updates) {
    spawnSync("npx", ["vercel", "env", "rm", row.vercelKey, "production", "--yes"], {
      cwd: process.cwd(),
      shell: true,
      stdio: "inherit",
    });
    const add = spawnSync(
      "npx",
      ["vercel", "env", "add", row.vercelKey, "production"],
      {
        cwd: process.cwd(),
        shell: true,
        input: row.secret,
        stdio: ["pipe", "inherit", "inherit"],
        encoding: "utf8",
      },
    );
    if (add.status !== 0) {
      throw new Error(`vercel env add ${row.vercelKey} failed`);
    }
    console.log(`  ✓ ${row.vercelKey} updated`);
  }

  console.log("\nRedeploy production, then run:");
  console.log("  npm run smoke:stripe:production-webhooks");
  console.log("  npm run smoke:stripe:production-ingress");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
