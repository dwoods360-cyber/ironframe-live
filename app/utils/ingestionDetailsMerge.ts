import type { Prisma } from '@prisma/client';

/**
 * Parse `ingestionDetails` text into a plain object for shallow merge.
 * Preserves Ironsight `aiTrace` and other keys; non-JSON legacy text is wrapped.
 */
export function parseIngestionDetailsForMerge(
  raw: string | null | undefined,
): Record<string, Prisma.InputJsonValue> {
  if (raw == null || raw.trim() === '') {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ...(parsed as Record<string, Prisma.InputJsonValue>) };
    }
    return { _preservedNonObjectIngestion: parsed as Prisma.InputJsonValue };
  } catch {
    return { _preservedRawIngestionDetails: raw };
  }
}

/** Shallow-merge `patch` into parsed `ingestionDetails` and return JSON text for Prisma. */
export function mergeIngestionDetailsPatch(
  raw: string | null | undefined,
  patch: Record<string, Prisma.InputJsonValue>,
): string {
  const base = parseIngestionDetailsForMerge(raw);
  return JSON.stringify({ ...base, ...patch });
}
