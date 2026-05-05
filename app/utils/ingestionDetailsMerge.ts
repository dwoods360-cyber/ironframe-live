import type { Prisma } from "@prisma/client";

/**
 * Parse `ingestionDetails` into a plain object for shallow merge.
 * Supports legacy string JSON, Prisma `Json` / Postgres JSONB objects, and non-JSON legacy text.
 */
export function parseIngestionDetailsForMerge(
  raw: string | Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
): Record<string, Prisma.InputJsonValue> {
  if (raw == null) {
    return {};
  }
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return { ...(raw as Record<string, Prisma.InputJsonValue>) };
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (s === "") return {};
    try {
      const parsed = JSON.parse(s) as unknown;
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { ...(parsed as Record<string, Prisma.InputJsonValue>) };
      }
      return { _preservedNonObjectIngestion: parsed as Prisma.InputJsonValue };
    } catch {
      return { _preservedRawIngestionDetails: raw };
    }
  }
  return { _preservedNonObjectIngestion: raw as Prisma.InputJsonValue };
}

/** Shallow-merge for `SimThreatEvent.ingestionDetails` (native JSONB / Prisma `Json`). */
export function mergeIngestionDetailsPatchJson(
  raw: string | Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  patch: Record<string, Prisma.InputJsonValue>,
): Prisma.InputJsonValue {
  const base = parseIngestionDetailsForMerge(raw);
  return { ...base, ...patch } as Prisma.InputJsonValue;
}

/**
 * Shallow-merge for `ThreatEvent.ingestionDetails` (string column) and client stores expecting string JSON text.
 */
export function mergeIngestionDetailsPatch(
  raw: string | Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  patch: Record<string, Prisma.InputJsonValue>,
): string {
  return JSON.stringify(mergeIngestionDetailsPatchJson(raw, patch));
}

/** Normalize DB JSONB or string ingestion for UI components expecting string JSON. */
export function normalizeIngestionDetailsToString(
  value: string | Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}
