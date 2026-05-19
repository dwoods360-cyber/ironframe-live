import "server-only";

/** In-memory vault secret handles — tenant-scoped keys `tenant:{uuid}:{key}`. */
const secrets = new Map<string, string>();

function tenantKey(tenantId: string, key: string): string {
  return `tenant:${tenantId.trim()}:${key}`;
}

export function vaultSecretSet(tenantId: string, key: string, value: string): void {
  secrets.set(tenantKey(tenantId, key), value);
}

export function vaultSecretGet(tenantId: string, key: string): string | undefined {
  return secrets.get(tenantKey(tenantId, key));
}

export function clearVaultSecretsForTenant(tenantId: string): number {
  const prefix = `tenant:${tenantId.trim()}:`;
  let n = 0;
  for (const k of [...secrets.keys()]) {
    if (k.startsWith(prefix)) {
      secrets.delete(k);
      n += 1;
    }
  }
  return n;
}

/** @deprecated Global clear — prefer {@link clearVaultSecretsForTenant}. */
export function clearVaultSecrets(): number {
  const n = secrets.size;
  secrets.clear();
  return n;
}

export function vaultSecretsSize(): number {
  return secrets.size;
}
