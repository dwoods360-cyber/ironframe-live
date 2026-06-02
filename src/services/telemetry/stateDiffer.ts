export interface TelemetryPatch {
  added: Record<string, unknown>;
  updated: Record<string, unknown>;
  removed: string[];
  unchangedCount: number;
  tenantId: string;
}

const MAX_KEY_THRESHOLD = 200;

/**
 * Validates that no unsafe floats are contained within the telemetry tree.
 */
function validateNumericSanity(value: unknown): void {
  if (typeof value === "number" && !Number.isInteger(value)) {
    throw new Error("EPIC_17_DIFF_FLOAT_BLOCKED");
  }
  if (value && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      validateNumericSanity((value as Record<string, unknown>)[key]);
    }
  }
}

/**
 * Flattens a nested object configuration into deterministic dot-notation strings.
 */
function flattenObject(obj: unknown, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (!obj || typeof obj !== "object") return result;

  // Enforce deterministic sorting order on keys
  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();

  for (const key of sortedKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = (obj as Record<string, unknown>)[key];

    if (value !== null && typeof value === "object" && typeof value !== "bigint" && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, path));
    } else {
      result[path] = value;
    }
  }

  return result;
}

/**
 * Computes a highly compact, tenant-scoped delta patch between two state payloads.
 */
export function diffTelemetryState(previous: unknown, next: unknown, tenantId: string): TelemetryPatch {
  if (!tenantId?.trim()) {
    throw new Error("EPIC_17_INVALID_TENANT_CONTEXT");
  }

  // Fail-closed on environmental data noise
  validateNumericSanity(previous);
  validateNumericSanity(next);

  const flatPrev = flattenObject(previous);
  const flatNext = flattenObject(next);

  if (Object.keys(flatNext).length > MAX_KEY_THRESHOLD) {
    throw new Error("EPIC_17_PATCH_THRESHOLD_BREACHED");
  }

  const patch: TelemetryPatch = {
    added: {},
    updated: {},
    removed: [],
    unchangedCount: 0,
    tenantId,
  };

  // Identify added and updated nodes
  for (const key of Object.keys(flatNext).sort()) {
    if (!(key in flatPrev)) {
      patch.added[key] = flatNext[key];
    } else if (flatPrev[key] !== flatNext[key]) {
      patch.updated[key] = flatNext[key];
    } else {
      patch.unchangedCount++;
    }
  }

  // Identify removed paths
  for (const key of Object.keys(flatPrev).sort()) {
    if (!(key in flatNext)) {
      patch.removed.push(key);
    }
  }

  return patch;
}
