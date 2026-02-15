export type TenantKey = "medshield" | "vaultbank" | "gridcore";

export const TENANT_UUIDS: Record<TenantKey, string> = {
  medshield: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
  vaultbank: "c6932d16-a716-4a07-9bc4-6ec987f641e2",
  gridcore: "4d1ea1a4-b6a8-4d12-9eb3-2f0a64ad0ef7",
};

export function detectTenantFromPath(pathname: string): TenantKey | null {
  if (pathname === "/medshield" || pathname.startsWith("/medshield/")) return "medshield";
  if (pathname === "/vaultbank" || pathname.startsWith("/vaultbank/")) return "vaultbank";
  if (pathname === "/gridcore" || pathname.startsWith("/gridcore/")) return "gridcore";
  return null;
}

export function assertTenantAccess(activeTenantUuid: string | null, targetTenantUuid: string) {
  if (!activeTenantUuid) {
    return true;
  }

  return activeTenantUuid === targetTenantUuid;
}
