import prisma from "@/lib/prisma";
import { governanceMultiplierBpsFromTenantIndustryCode } from "@/app/utils/tenantGovernanceMultiplier";

/**
 * RFC4122 variant UUID — aligned with `getTenantGovernanceMultiplierBps` / compliance guards.
 * Same pattern as `app/actions/complianceActions.ts` UUID_RE.
 */
export const TENANT_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Authoritative governance multiplier (bps) from `tenants.industry`.
 * **`getTenantGovernanceMultiplierBps`** (compliance UI) delegates here — same integers used for
 * SimThreatEvent rows and `computeSimThreatTenantBindingHash` seals in `ingressGateway.writeThreatEvent`.
 * Assignee actions do **not** filter by `governanceHash`; lookup is `(risk id, tenant UUID)` only.
 */
export async function resolveGovernanceMultiplierBpsForTenantUuid(
  tenantUuid: string,
): Promise<{ ok: true; bps: number } | { ok: false; error: string }> {
  const tid = tenantUuid.trim();
  if (!TENANT_UUID_REGEX.test(tid)) return { ok: false, error: "Invalid tenant UUID." };
  const row = await prisma.tenant.findUnique({
    where: { id: tid },
    select: { industry: true },
  });
  const bps = governanceMultiplierBpsFromTenantIndustryCode(row?.industry);
  return { ok: true, bps };
}
