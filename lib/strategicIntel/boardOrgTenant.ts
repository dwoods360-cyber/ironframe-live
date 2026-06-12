import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { requireIronboardTenantId } from "@/lib/ironboard/crmTenantContext";

/** Board organizational tenant for Infasys Strategic Intel CRM rows. */
export function resolveBoardOrgTenantId(): string {
  const fromEnv = process.env.IRONBOARD_BOARD_ORG_TENANT_UUID?.trim();
  if (fromEnv) return requireIronboardTenantId(fromEnv);
  return TENANT_UUIDS.medshield;
}
