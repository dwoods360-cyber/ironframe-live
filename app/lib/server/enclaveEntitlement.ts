import "server-only";

import prisma from "@/lib/prisma";
import {
  COMMERCIAL_TIER,
  ENCLAVE_ROLE,
  PATH_B_INCLUDED_SUBTENANT_ENCLAVES,
  SUBTENANT_ENCLAVE_CAP_BY_TIER,
  type CommercialTierCode,
  type EnclaveRoleCode,
  formatUsdWhole,
  PAID_ENCLAVE_LIST_USD,
} from "@/lib/ironframeProductKnowledge/commercial";

export type EnclaveEntitlementSnapshot = {
  parentTenantId: string;
  parentSlug: string;
  commercialTier: CommercialTierCode;
  maxSubtenants: number;
  activeSubtenants: number;
  remainingSlots: number;
};

export function parseCommercialTier(raw: string | null | undefined): CommercialTierCode {
  const value = String(raw ?? "").trim().toUpperCase();
  if (value && value in SUBTENANT_ENCLAVE_CAP_BY_TIER) {
    return value as CommercialTierCode;
  }
  return COMMERCIAL_TIER.PATH_B;
}

export function parseEnclaveRole(raw: string | null | undefined): EnclaveRoleCode {
  const value = String(raw ?? "").trim().toUpperCase();
  if (value === ENCLAVE_ROLE.SUBTENANT) return ENCLAVE_ROLE.SUBTENANT;
  return ENCLAVE_ROLE.PRIMARY;
}

export function resolveMaxSubtenantSlots(input: {
  commercialTier: CommercialTierCode;
  entitledSubtenantSlots?: number | null;
}): number {
  if (
    typeof input.entitledSubtenantSlots === "number" &&
    Number.isFinite(input.entitledSubtenantSlots) &&
    input.entitledSubtenantSlots >= 0
  ) {
    return Math.floor(input.entitledSubtenantSlots);
  }
  return SUBTENANT_ENCLAVE_CAP_BY_TIER[input.commercialTier] ?? PATH_B_INCLUDED_SUBTENANT_ENCLAVES;
}

export function evaluateSubtenantCap(input: {
  activeSubtenants: number;
  maxSubtenants: number;
}): { ok: true; remainingSlots: number } | { ok: false; error: string; remainingSlots: number } {
  const remainingSlots = Math.max(0, input.maxSubtenants - input.activeSubtenants);
  if (input.activeSubtenants >= input.maxSubtenants) {
    return {
      ok: false,
      remainingSlots: 0,
      error:
        `Subtenant Enclave cap reached (${input.activeSubtenants}/${input.maxSubtenants}). ` +
        `Additional enclaves require an executed Multi-Entity Change Order ` +
        `(Paid Enclave list ${formatUsdWhole(PAID_ENCLAVE_LIST_USD)}/yr).`,
    };
  }
  return { ok: true, remainingSlots };
}

export async function loadEnclaveEntitlementForParent(
  parentTenantId: string,
): Promise<EnclaveEntitlementSnapshot | { ok: false; error: string }> {
  const parent = await prisma.tenant.findUnique({
    where: { id: parentTenantId },
    select: {
      id: true,
      slug: true,
      enclaveRole: true,
      commercialTier: true,
      entitledSubtenantSlots: true,
      parentTenantId: true,
      _count: { select: { childEnclaves: true } },
    },
  });

  if (!parent) {
    return { ok: false, error: "Parent Primary Entity workspace was not found." };
  }

  if (parseEnclaveRole(parent.enclaveRole) !== ENCLAVE_ROLE.PRIMARY) {
    return {
      ok: false,
      error: `Workspace "${parent.slug}" is a Subtenant Enclave and cannot parent further enclaves.`,
    };
  }

  if (parent.parentTenantId) {
    return {
      ok: false,
      error: `Workspace "${parent.slug}" already has a parent — only Primary Entities may own Subtenant Enclaves.`,
    };
  }

  const commercialTier = parseCommercialTier(parent.commercialTier);
  const maxSubtenants = resolveMaxSubtenantSlots({
    commercialTier,
    entitledSubtenantSlots: parent.entitledSubtenantSlots,
  });
  const activeSubtenants = parent._count.childEnclaves;

  return {
    parentTenantId: parent.id,
    parentSlug: parent.slug,
    commercialTier,
    maxSubtenants,
    activeSubtenants,
    remainingSlots: Math.max(0, maxSubtenants - activeSubtenants),
  };
}

export async function assertCanProvisionSubtenantUnderParent(
  parentTenantId: string,
): Promise<
  | { ok: true; entitlement: EnclaveEntitlementSnapshot }
  | { ok: false; error: string }
> {
  const entitlement = await loadEnclaveEntitlementForParent(parentTenantId);
  if ("ok" in entitlement && entitlement.ok === false) {
    return entitlement;
  }

  const snap = entitlement as EnclaveEntitlementSnapshot;
  const gate = evaluateSubtenantCap({
    activeSubtenants: snap.activeSubtenants,
    maxSubtenants: snap.maxSubtenants,
  });
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }
  return { ok: true, entitlement: { ...snap, remainingSlots: gate.remainingSlots } };
}

export async function resolveParentTenantIdBySlug(
  parentTenantSlugRaw: string,
): Promise<{ ok: true; parentTenantId: string; parentSlug: string } | { ok: false; error: string }> {
  const slug = parentTenantSlugRaw.trim().toLowerCase();
  if (!slug) {
    return { ok: false, error: "Parent Primary workspace slug is required for Subtenant Enclaves." };
  }
  const parent = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, enclaveRole: true },
  });
  if (!parent) {
    return { ok: false, error: `Parent Primary workspace "${slug}" is not provisioned.` };
  }
  if (parseEnclaveRole(parent.enclaveRole) !== ENCLAVE_ROLE.PRIMARY) {
    return {
      ok: false,
      error: `Workspace "${parent.slug}" is not a Primary Entity and cannot receive Subtenant Enclaves.`,
    };
  }
  return { ok: true, parentTenantId: parent.id, parentSlug: parent.slug };
}
