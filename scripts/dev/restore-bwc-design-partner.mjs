#!/usr/bin/env node
/**
 * Idempotent restore of the BWC design-partner tenant after destructive prisma seed.
 * Safe to re-run — upserts tenant, company, and ACTIVE billing rows.
 *
 *   npx tsx -r ./scripts/preload-local-env.cjs scripts/dev/restore-bwc-design-partner.mjs
 */
import { PrismaClient } from "@prisma/client";

const BWC = {
  id: "ba130f7c-453e-4c79-a611-0d69c1904a10",
  slug: "bwc",
  name: "The Blackwoods Coffee Co.",
  industry: "Food & Beverage",
  /** Wil completed ALE on get-started (2026-07-03); restore a non-zero baseline for exports smoke. */
  aleBaselineCents: 250_000_000n,
};

function manualStripeCustomerIdForSlug(slug) {
  return `manual_pending_${slug.trim().toLowerCase()}`;
}

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: BWC.slug },
    create: {
      id: BWC.id,
      slug: BWC.slug,
      name: BWC.name,
      industry: BWC.industry,
      ale_baseline: BWC.aleBaselineCents,
    },
    update: {
      name: BWC.name,
      industry: BWC.industry,
      ale_baseline: BWC.aleBaselineCents,
    },
    select: { id: true, slug: true, name: true },
  });

  const companyCount = await prisma.company.count({ where: { tenantId: tenant.id } });
  if (companyCount === 0) {
    await prisma.company.create({
      data: {
        name: BWC.name,
        sector: BWC.industry,
        industry_avg_loss_cents: BWC.aleBaselineCents,
        infrastructure_val_cents: 5_000_000_000n,
        tenantId: tenant.id,
      },
    });
  }

  const stripeCustomerId = manualStripeCustomerIdForSlug(BWC.slug);
  await prisma.tenantBilling.upsert({
    where: { tenantSlug: BWC.slug },
    create: {
      tenantSlug: BWC.slug,
      stripeCustomerId,
      status: "ACTIVE",
    },
    update: {
      status: "ACTIVE",
      stripeCustomerId,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        tenant,
        billing: "ACTIVE",
        stripeCustomerId,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
