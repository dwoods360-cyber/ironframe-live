"use client";

import { useEffect } from "react";
import { useTenantContext } from "@/app/context/TenantProvider";
import { useRiskStore } from "@/app/store/riskStore";
import { setIronguardEffectiveTenant } from "@/app/utils/ironguardSession";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

const MEDSHIELD_UUID = TENANT_UUIDS.medshield;
const MEDSHIELD_COMPANY_LABEL = "Medshield Health";

/**
 * Resolves the header `[ PENDING SELECTION ]` lock: missing tenant scope → Medshield cookie + Ironguard;
 * Medshield scope with no company label → seed `selectedTenantName` for Active Risks filters.
 */
export default function CommandCenter() {
  const { activeTenantUuid } = useTenantContext();
  const selectedTenantName = useRiskStore((s) => s.selectedTenantName);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const uuid = activeTenantUuid?.trim();
    if (!uuid) {
      document.cookie = `ironframe-tenant=${encodeURIComponent(MEDSHIELD_UUID)};path=/;max-age=31536000;SameSite=Lax`;
      window.dispatchEvent(new CustomEvent("ironframe-tenant-changed"));
      setIronguardEffectiveTenant(MEDSHIELD_UUID);
      useRiskStore.getState().setSelectedTenantName(MEDSHIELD_COMPANY_LABEL);
      return;
    }

    const pendingHeader = !selectedTenantName?.trim();
    const stuckPendingLabel =
      pendingHeader ||
      (selectedTenantName?.trim().toUpperCase().includes("PENDING") ?? false);

    if (stuckPendingLabel && uuid === MEDSHIELD_UUID) {
      useRiskStore.getState().setSelectedTenantName(MEDSHIELD_COMPANY_LABEL);
    }
  }, [activeTenantUuid, selectedTenantName]);

  return null;
}
