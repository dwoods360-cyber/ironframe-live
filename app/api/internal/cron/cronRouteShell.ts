/** JSON-safe serialization preserving BigInt integer cents as decimal strings. */
export function serializeCronJsonPayload(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, raw) => (typeof raw === "bigint" ? raw.toString() : raw)),
  );
}

export function flattenCronTenantRuns<T extends Record<string, unknown>>(
  runs: T[],
): Record<string, unknown> {
  if (runs.length === 1) return runs[0]!;
  return { tenantCount: runs.length, tenants: runs };
}

/** Coerce metric cents to BigInt without floating-point conversion. */
export function coerceBigIntCents(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return BigInt(trimmed);
    return null;
  }
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return BigInt(value);
  }
  return null;
}
