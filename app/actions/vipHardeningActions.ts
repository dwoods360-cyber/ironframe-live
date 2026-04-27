"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

/** $50,000.00 simulated lab debit from Medshield `Tenant.ale_baseline` (USD cents). */
const VIP_HARDEN_COST_CENTS = 5_000_000n;
const MEDSHIELD_TENANT_ID = TENANT_UUIDS.medshield;

export type HardenVipTargetResult = { ok: true } | { ok: false; error: string };

/**
 * Invest in VIP hardening: debits Medshield ALE baseline, sets `isHardened` on a Level-5 synthetic target.
 * Readiness gains +2 per hardened VIP via `calculateReadinessScore` (`hardenedVipCount`).
 */
export async function hardenVIPTarget(syntheticEmployeeId: string): Promise<HardenVipTargetResult> {
  const session = await getSupabaseSessionUser();
  if (session == null) {
    return { ok: false, error: "Sign in to invest in hardening." };
  }

  const id = syntheticEmployeeId?.trim();
  if (!id) return { ok: false, error: "Missing synthetic target id." };

  const activeTenant = await getActiveTenantUuidFromCookies();
  if (activeTenant !== MEDSHIELD_TENANT_ID) {
    return {
      ok: false,
      error:
        "VIP hardening debits Medshield simulated capital. Switch the active tenant to Medshield (lab).",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.syntheticEmployee.findUnique({
        where: { id },
        select: { clearanceLevel: true, isHardened: true },
      });
      if (!target) {
        throw new Error("Synthetic target not found.");
      }
      if (target.clearanceLevel !== 5) {
        throw new Error("Hardening applies to Level-5 (VIP) targets only.");
      }
      if (target.isHardened) {
        throw new Error("This target is already hardened.");
      }

      const tenant = await tx.tenant.findUniqueOrThrow({
        where: { id: MEDSHIELD_TENANT_ID },
        select: { ale_baseline: true },
      });
      if (tenant.ale_baseline < VIP_HARDEN_COST_CENTS) {
        throw new Error("Insufficient Medshield ALE baseline for this investment ($50,000 required).");
      }

      await tx.tenant.update({
        where: { id: MEDSHIELD_TENANT_ID },
        data: { ale_baseline: tenant.ale_baseline - VIP_HARDEN_COST_CENTS },
      });
      await tx.syntheticEmployee.update({
        where: { id },
        data: { isHardened: true },
      });
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }

  revalidatePath("/integrity");
  revalidatePath("/board-report");
  revalidatePath("/medshield");
  revalidatePath("/");
  return { ok: true };
}
