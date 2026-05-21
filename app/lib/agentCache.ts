import "server-only";

/** In-memory agent runtime cache — tenant-scoped keys `tenant:{uuid}:{key}`. */
const cache = new Map<string, unknown>();

function tenantKey(tenantId: string, key: string): string {
  return `tenant:${tenantId.trim()}:${key}`;
}

export function agentCacheSet(tenantId: string, key: string, value: unknown): void {
  cache.set(tenantKey(tenantId, key), value);
}

export function agentCacheGet<T>(tenantId: string, key: string): T | undefined {
  return cache.get(tenantKey(tenantId, key)) as T | undefined;
}

export function clearAgentCacheForTenant(tenantId: string): number {
  const prefix = `tenant:${tenantId.trim()}:`;
  let n = 0;
  for (const k of [...cache.keys()]) {
    if (k.startsWith(prefix)) {
      cache.delete(k);
      n += 1;
    }
  }
  return n;
}

/** @deprecated Global clear — prefer {@link clearAgentCacheForTenant}. */
export function clearAgentCache(): number {
  const n = cache.size;
  cache.clear();
  return n;
}

export function agentCacheSize(): number {
  return cache.size;
}
