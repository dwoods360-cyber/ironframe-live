/** JSON-safe serialization preserving BigInt integer cents as decimal strings. */
export function serializeCronJsonPayload(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, raw) => (typeof raw === "bigint" ? raw.toString() : raw)),
  );
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
