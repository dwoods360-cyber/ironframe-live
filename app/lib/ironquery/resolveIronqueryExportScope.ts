import "server-only";

import prisma from "@/lib/prisma";
import { fetchUtilityRateForAnalystExport } from "@/app/services/ironbloom/rateEngine";
import { resolveTenantLocationForExport } from "@/app/config/tenantUtilityLocation";
import { tenantKeyFromUuid } from "@/app/utils/tenantIsolation";
import type { UtilityRateQuote } from "@/app/types/ironbloomGridcore";

/** Seed-tenant analyst baselines (BigInt cents) — provisioned tenants use `tenants.ale_baseline`. */
const SEED_ANALYST_BASELINE_CENTS: Record<"medshield" | "vaultbank" | "gridcore", bigint> = {
  medshield: 1110000000n,
  vaultbank: 590000000n,
  gridcore: 470000000n,
};

export type IronqueryExportScope = {
  tenantId: string;
  /** Filename + CSV tenantKey — seed slug or provisioned workspace slug (e.g. run2). */
  exportKey: string;
  aleBaselineCents: bigint;
};

export async function resolveIronqueryExportScope(
  tenantId: string,
): Promise<IronqueryExportScope | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true, ale_baseline: true },
  });
  if (!tenant) return null;

  const seedKey = tenantKeyFromUuid(tenantId);
  const exportKey = seedKey ?? tenant.slug.trim().toLowerCase();
  if (!exportKey) return null;

  let aleBaselineCents: bigint;
  if (seedKey && seedKey in SEED_ANALYST_BASELINE_CENTS) {
    aleBaselineCents = SEED_ANALYST_BASELINE_CENTS[seedKey as keyof typeof SEED_ANALYST_BASELINE_CENTS];
  } else {
    aleBaselineCents = tenant.ale_baseline;
  }

  if (aleBaselineCents <= 0n) return null;

  return { tenantId, exportKey, aleBaselineCents };
}

export async function resolveUtilityRateForExportScope(exportKey: string): Promise<UtilityRateQuote> {
  return fetchUtilityRateForAnalystExport(resolveTenantLocationForExport(exportKey));
}
