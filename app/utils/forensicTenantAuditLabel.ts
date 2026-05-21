import { TENANT_UUIDS, type TenantKey } from "@/app/utils/tenantIsolation";

/** Maps canonical tenant UUID → uppercase slug for audit evidence (e.g. MEDSHIELD). */
export function uuidToForensicTenantAuditLabel(uuid: string | null | undefined): string {
  if (!uuid?.trim()) return "NONE";
  const lower = uuid.trim().toLowerCase();
  for (const [key, id] of Object.entries(TENANT_UUIDS) as [TenantKey, string][]) {
    if (id.toLowerCase() === lower) return key.toUpperCase();
  }
  return `UUID:${uuid.trim().slice(0, 8)}`;
}
