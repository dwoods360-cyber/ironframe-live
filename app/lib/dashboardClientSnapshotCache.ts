/** Per-tenant last-good dashboard payload — survives Command Post remounts during client navigation. */
const snapshotByTenant = new Map<string, unknown>();

export function readDashboardClientSnapshot<T>(tenantUuid: string | null | undefined): T | null {
  const key = tenantUuid?.trim();
  if (!key) return null;
  return (snapshotByTenant.get(key) as T | undefined) ?? null;
}

export function writeDashboardClientSnapshot(tenantUuid: string | null | undefined, payload: unknown): void {
  const key = tenantUuid?.trim();
  if (!key || payload == null) return;
  snapshotByTenant.set(key, payload);
}

export function clearDashboardClientSnapshot(tenantUuid?: string | null): void {
  if (tenantUuid?.trim()) {
    snapshotByTenant.delete(tenantUuid.trim());
    return;
  }
  snapshotByTenant.clear();
}
