import type { PartnerProvisionerScope } from "@/app/lib/auth/partnerProvisionerAccess";

export function tenantIdsFromPartnerScope(scope: PartnerProvisionerScope): string[] | undefined {
  if (scope.kind === "all") return undefined;
  return scope.tenantIds.length > 0 ? scope.tenantIds : [];
}
