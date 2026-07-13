/**
 * Mint a per-client Stripe Payment Link with slug metadata (provision or activation path).
 *
 * Usage:
 *   npm run stripe:client-link -- --slug acmecorp --company "Acme Corp"
 *   npm run stripe:client-link -- --slug run4b --company "Run 4B" --mode activation
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import Stripe from "stripe";

import { buildTenantSubdomainOrigin } from "../../app/lib/tenantSubdomain";
import { loadStripeSmokeEnv, resolveStripeSecretKey } from "./stripeSmokeEnv";

type LinkMode = "provision" | "activation";

function readArg(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1]?.trim() || null;
}

function loadCatalogPriceId(): string {
  const artifactPath = resolve(process.cwd(), "scripts/dev/stripe-catalog-artifact.json");
  try {
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as { priceId?: string };
    if (artifact.priceId?.trim()) return artifact.priceId.trim();
  } catch {
    // fall through
  }
  throw new Error(
    "Missing scripts/dev/stripe-catalog-artifact.json — run npm run stripe:provision-catalog first.",
  );
}

async function main(): Promise<void> {
  loadStripeSmokeEnv();
  const stripeSecretKey = resolveStripeSecretKey();
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is required.");
  }

  const slug = readArg("--slug")?.trim().toLowerCase() ?? "";
  const companyName = readArg("--company")?.trim() ?? "";
  const mode = (readArg("--mode")?.trim().toLowerCase() as LinkMode | null) ?? "provision";

  if (!slug || slug.length < 2) {
    throw new Error("--slug is required (2–63 chars).");
  }
  if (!companyName || companyName.length < 2) {
    throw new Error('--company is required (e.g. --company "Acme Corp").');
  }
  if (mode !== "provision" && mode !== "activation") {
    throw new Error('--mode must be "provision" or "activation".');
  }

  const stripe = new Stripe(stripeSecretKey);
  const priceId = loadCatalogPriceId();
  const catalogKey = `${mode}:${slug}`;
  const port = Number(process.env.PORT?.trim() || "3000") || 3000;
  const activationSuccessUrl = `${buildTenantSubdomainOrigin(slug, port).replace(/\/+$/, "")}/get-started?billingRefresh=1`;

  const listed = await stripe.paymentLinks.list({ limit: 100, active: true });
  const existing = listed.data.find((link) => link.metadata?.ironframe_client_link === catalogKey);
  if (existing?.url) {
    console.log(JSON.stringify({ ok: true, idempotent: true, mode, slug, url: existing.url }, null, 2));
    return;
  }

  const link =
    mode === "provision"
      ? await stripe.paymentLinks.create({
          line_items: [{ price: priceId, quantity: 1 }],
          metadata: {
            ironframe_client_link: catalogKey,
            slug,
            companyName,
          },
        })
      : await stripe.paymentLinks.create({
          line_items: [{ price: priceId, quantity: 1 }],
          metadata: {
            ironframe_client_link: catalogKey,
            tenant_slug: slug,
          },
          payment_intent_data: {
            metadata: {
              tenant_slug: slug,
            },
          },
          after_completion: {
            type: "redirect",
            redirect: { url: activationSuccessUrl },
          },
        });

  const record = {
    generatedAt: new Date().toISOString(),
    mode,
    slug,
    companyName,
    paymentLinkId: link.id,
    url: link.url,
  };

  const clientLinksPath = resolve(process.cwd(), "scripts/dev/stripe-client-links.json");
  let ledger: unknown[] = [];
  try {
    ledger = JSON.parse(readFileSync(clientLinksPath, "utf8")) as unknown[];
    if (!Array.isArray(ledger)) ledger = [];
  } catch {
    ledger = [];
  }
  ledger.push(record);
  writeFileSync(clientLinksPath, JSON.stringify(ledger, null, 2), "utf8");

  console.log(JSON.stringify({ ok: true, ...record, ledgerPath: clientLinksPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
