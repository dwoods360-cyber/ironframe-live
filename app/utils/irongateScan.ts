import type { Prisma } from "@prisma/client";

import { parseIngestionDetailsForMerge } from "@/app/utils/ingestionDetailsMerge";

export type IrongateScanVerdict = {
  status: 'CLEAN' | 'MALICIOUS';
  scannedAt?: string;
};

/**
 * Read `ingestionDetails` JSON text for `irongateScan` (DMZ autonomous sanitization).
 */
export function parseIrongateScanFromIngestionDetails(
  raw: string | Prisma.JsonValue | null | undefined,
): IrongateScanVerdict | null {
  if (raw == null) return null;
  if (typeof raw === "string" && raw.trim() === "") return null;
  try {
    const o = parseIngestionDetailsForMerge(raw ?? null) as Record<string, unknown>;
    const ig = o.irongateScan;
    if (ig != null && typeof ig === 'object' && !Array.isArray(ig)) {
      const rec = ig as Record<string, unknown>;
      const st = rec.status;
      if (st === 'CLEAN' || st === 'MALICIOUS') {
        const scannedAt = rec.scannedAt;
        return {
          status: st,
          scannedAt: typeof scannedAt === 'string' ? scannedAt : undefined,
        };
      }
    }
  } catch {
    /* not JSON */
  }
  return null;
}
