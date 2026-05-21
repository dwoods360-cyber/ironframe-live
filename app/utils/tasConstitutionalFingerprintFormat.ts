/** Client-safe helpers for TAS.md SHA-256 fingerprint (no `fs`). */

const SHA256_HEX_LEN = 64;

export function shortenSha256Hex(full: string): string {
  const h = full.trim().toLowerCase();
  if (h.length === SHA256_HEX_LEN && /^[a-f0-9]+$/.test(h)) {
    return `${h.slice(0, 6)}…${h.slice(-4)}`;
  }
  if (h.length <= 14) return h;
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
}

export function appendConstitutionalHashToMetadataTag(
  baseTag: string | null | undefined,
  fullHexSha256: string,
): string {
  const hex = fullHexSha256.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hex)) return (baseTag ?? "").trim();
  const frag = `constitutionalHash=${hex}`;
  const base = (baseTag ?? "").trim();
  return base ? `${base}|${frag}` : frag;
}

export function extractConstitutionalHashFromMetadataTag(tag: string | null | undefined): string | null {
  const t = (tag ?? "").trim();
  if (!t) return null;
  const m = t.match(/(?:^|\|)constitutionalHash=([a-fA-F0-9]{64})(?:\||$)/);
  const h = m?.[1]?.toLowerCase();
  return h && /^[a-f0-9]{64}$/.test(h) ? h : null;
}

function safeParseJsonObject(raw: string | undefined): Record<string, unknown> | null {
  if (!raw?.trim()) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Pull stored fingerprint from client `metadata_tag` or server `AuditLog.justification` JSON
 * (`THREAT_RESOLVED` payloads include `constitutionalHash`).
 */
export function extractConstitutionalHashFromLogEntry(entry: {
  metadata_tag?: string | null;
  justification?: string | null;
}): string | null {
  const fromMeta = extractConstitutionalHashFromMetadataTag(entry.metadata_tag);
  if (fromMeta) return fromMeta;
  const j = entry.justification?.trim();
  if (!j) return null;
  const parsed = safeParseJsonObject(j);
  if (!parsed) return null;
  const ch = parsed.constitutionalHash;
  if (typeof ch === "string") {
    const h = ch.trim().toLowerCase();
    if (/^[a-f0-9]{64}$/.test(h)) return h;
  }
  const innerMeta = parsed.metadata_tag;
  if (typeof innerMeta === "string") {
    return extractConstitutionalHashFromMetadataTag(innerMeta);
  }
  return null;
}
