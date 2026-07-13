/**
 * Phase 4/5 — production Stripe ingress + pricing surface probes (no live payment).
 *
 * Usage:
 *   npm run smoke:stripe:production-ingress
 *   PRODUCTION_ORIGIN=https://ironframegrc.com npm run smoke:stripe:production-ingress
 */
const PRODUCTION_ORIGIN = (process.env.PRODUCTION_ORIGIN ?? "https://ironframegrc.com").replace(
  /\/$/,
  "",
);

type ProbeResult = {
  name: string;
  ok: boolean;
  detail: string;
};

async function probeWebhookIngress(path: string): Promise<ProbeResult> {
  const url = `${PRODUCTION_ORIGIN}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": "invalid" },
    body: "{}",
  });
  const text = await response.text();
  const quarantined = /deployment quarantine|LOCAL DEVELOPMENT ONLY/i.test(text);
  const ok = response.status === 400 && !quarantined;
  return {
    name: `POST ${path}`,
    ok,
    detail: `status=${response.status}${quarantined ? " (quarantine HTML)" : ""}`,
  };
}

async function probePricing(): Promise<ProbeResult> {
  const response = await fetch(`${PRODUCTION_ORIGIN}/pricing`, {
    headers: { accept: "text/html" },
    redirect: "follow",
  });
  const html = await response.text();
  const hasBuyNow = /Buy now/i.test(html);
  const contactOnly = /Contact sales/i.test(html) && !hasBuyNow;
  return {
    name: "GET /pricing",
    ok: response.status === 200 && hasBuyNow,
    detail: `status=${response.status} buyNow=${hasBuyNow} contactOnly=${contactOnly}`,
  };
}

async function main(): Promise<void> {
  const probes = await Promise.all([
    probeWebhookIngress("/api/webhooks/stripe"),
    probeWebhookIngress("/api/billing/webhook"),
    probePricing(),
  ]);

  console.log(`=== Production Stripe ingress probes (${PRODUCTION_ORIGIN}) ===\n`);
  let failed = 0;
  for (const probe of probes) {
    const mark = probe.ok ? "PASS" : "FAIL";
    console.log(`${mark}  ${probe.name} — ${probe.detail}`);
    if (!probe.ok) failed += 1;
  }

  console.log("\nProduction env checklist (Vercel → Production):");
  console.log("  - STRIPE_SECRET_KEY (live)");
  console.log("  - STRIPE_INSTANT_CHECKOUT_WEBHOOK_SECRET");
  console.log("  - STRIPE_BILLING_WEBHOOK_SECRET");
  console.log("  - NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL");
  console.log("  - STRIPE_CREDENTIAL_MODE=live");

  if (failed > 0) {
    console.error(`\n${failed} probe(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll production ingress probes passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
