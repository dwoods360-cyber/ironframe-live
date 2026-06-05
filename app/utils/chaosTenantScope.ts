import { parseIngestionDetailsForMerge } from "@/app/utils/ingestionDetailsMerge";

/** Parse session tenant UUID stamped on chaos inject (`tenantScopeUuid` in ingestion JSON). */
export function parseTenantScopeUuidFromIngestion(
  ingestionDetails: string | null | undefined,
): string | null {
  try {
    const j = parseIngestionDetailsForMerge(ingestionDetails ?? null) as {
      tenantScopeUuid?: unknown;
    };
    const scope = typeof j.tenantScopeUuid === "string" ? j.tenantScopeUuid.trim() : null;
    return scope || null;
  } catch {
    return null;
  }
}

function isChaosMarkedIngestion(ingestionDetails: string | null | undefined): boolean {
  try {
    const j = parseIngestionDetailsForMerge(ingestionDetails ?? null) as Record<string, unknown>;
    if (j.isChaosTest === true) return true;
    if (j.incident_type === "CHAOS") return true;
    const et = String(j.entityType ?? "");
    return et.includes("CHAOS");
  } catch {
    return false;
  }
}

/**
 * Zero-bleed guard: chaos rows must carry `tenantScopeUuid` matching the active tenant selector.
 * Non-chaos rows from tenant-scoped API reads pass through.
 */
export function threatBelongsToTenantScope(
  ingestionDetails: string | null | undefined,
  activeTenantUuid: string | null | undefined,
): boolean {
  const tenant = activeTenantUuid?.trim();
  if (!tenant) return false;
  if (!isChaosMarkedIngestion(ingestionDetails)) return true;
  const scope = parseTenantScopeUuidFromIngestion(ingestionDetails);
  if (!scope) return false;
  return scope.toLowerCase() === tenant.toLowerCase();
}
