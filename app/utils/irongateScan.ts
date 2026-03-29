export type IrongateScanVerdict = {
  status: 'CLEAN' | 'MALICIOUS';
  scannedAt?: string;
};

/**
 * Read `ingestionDetails` JSON text for `irongateScan` (DMZ autonomous sanitization).
 */
export function parseIrongateScanFromIngestionDetails(
  raw: string | null | undefined,
): IrongateScanVerdict | null {
  if (raw == null || raw.trim() === '') return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
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
